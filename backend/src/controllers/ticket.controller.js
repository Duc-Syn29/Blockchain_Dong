const { ethers } = require("ethers");
const { Ticket, Event, User } = require("../models");
const { getContract, getMintFunctionName } = require("../config/blockchain");
const { normalizeWalletAddress } = require("../utils/normalizers");

const extractMintedTokenId = (receipt, contract, ownerWallet) => {
  for (const log of receipt.logs || []) {
    try {
      const parsedLog = contract.interface.parseLog(log);

      if (!parsedLog) {
        continue;
      }

      const candidateTokenId = parsedLog.args?.tokenId ?? parsedLog.args?.id;

      if (
        parsedLog.name === "Transfer" &&
        candidateTokenId !== undefined &&
        parsedLog.args?.from &&
        parsedLog.args?.to &&
        ethers.getAddress(parsedLog.args.from) === ethers.getAddress(ethers.ZeroAddress) &&
        ethers.getAddress(parsedLog.args.to) === ethers.getAddress(ownerWallet)
      ) {
        return candidateTokenId.toString();
      }

      if (/mint/i.test(parsedLog.name) && candidateTokenId !== undefined) {
        return candidateTokenId.toString();
      }
    } catch (error) {
      continue;
    }
  }

  return null;
};

exports.buyTicket = async (req, res) => {
  let tx = null;

  try {
    const { eventId, walletAddress } = req.body;

    if (!eventId) {
      return res.status(400).json({ message: "eventId is required" });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.walletAddress) {
      return res
        .status(400)
        .json({ message: "Please add a wallet address to your profile before buying tickets" });
    }

    if (walletAddress) {
      let normalizedWalletAddress = null;

      try {
        normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }

      if (normalizedWalletAddress !== user.walletAddress) {
        return res.status(403).json({ message: "You can only buy tickets with your own wallet" });
      }
    }

    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.totalTickets <= 0) {
      return res.status(400).json({ message: "This event is not open for ticket sales" });
    }

    const soldTickets = await Ticket.count({ where: { eventId } });
    if (soldTickets >= event.totalTickets) {
      return res.status(400).json({ message: "This event is sold out" });
    }

    const contract = getContract();
    const mintFunctionName = getMintFunctionName();

    tx = await contract[mintFunctionName](user.walletAddress, event.id);
    const receipt = await tx.wait();
    const tokenId = extractMintedTokenId(receipt, contract, user.walletAddress) || tx.hash;

    const ticket = await Ticket.create({
      tokenId,
      transactionHash: tx.hash,
      eventId: event.id,
      ownerWallet: user.walletAddress,
      status: "VALID",
    });

    res.status(201).json({
      message: "Ticket purchased successfully",
      ticket,
      transactionHash: tx.hash,
    });
  } catch (err) {
    console.error("Ticket purchase failed:", err);
    res.status(500).json({
      error: err.message || "Blockchain transaction failed",
      transactionHash: tx?.hash || null,
    });
  }
};

exports.getMyTickets = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.walletAddress) {
      return res.status(400).json({ message: "Wallet address not found for this user" });
    }

    const tickets = await Ticket.findAll({
      where: { ownerWallet: user.walletAddress },
      include: [Event],
      order: [["createdAt", "DESC"]],
    });

    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.checkIn = async (req, res) => {
  try {
    const { tokenId } = req.body;

    if (!tokenId) {
      return res.status(400).json({ message: "tokenId is required" });
    }

    const ticket = await Ticket.findOne({
      where: { tokenId },
      include: [Event],
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (req.user.role === "organizer" && ticket.Event?.organizerId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only check in tickets for events you organize" });
    }

    if (ticket.status === "USED") {
      return res.status(400).json({ message: "This ticket has already been used" });
    }

    ticket.status = "USED";
    await ticket.save();

    res.json({
      message: "Check-in successful",
      ticket,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
