const { ethers } = require("ethers");
const { Ticket, Event, TicketTier, User } = require("../models");
const { getContract, getMintFunctionName } = require("../config/blockchain");
const { normalizeWalletAddress } = require("../utils/normalizers");
const { isTemporaryWalletAddress } = require("../utils/walletState");

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
    const { eventId, walletAddress, quantity } = req.body;
    const parsedQuantity =
      quantity === undefined || quantity === null ? 1 : Number(quantity);

    if (!eventId) {
      return res.status(400).json({ message: "eventId is required" });
    }

    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 3) {
      return res.status(400).json({ message: "Số lượng vé chỉ được từ 1 đến 3" });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "organizer") {
      return res.status(403).json({ message: "Ban tổ chức không được mua vé" });
    }

    if (!user.walletAddress || isTemporaryWalletAddress(user.walletAddress)) {
      return res
        .status(400)
        .json({ message: "Vui lòng liên kết ví MetaMask trước khi mua vé" });
    }

    if (walletAddress) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);

      if (normalizedWalletAddress !== user.walletAddress) {
        return res.status(403).json({ message: "You can only buy tickets with your own wallet" });
      }
    }

    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const tier = await TicketTier.findOne({
      where: { eventId: event.id },
      order: [["id", "ASC"]],
    });

    if (!tier) {
      return res.status(400).json({ message: "This event does not have a ticket tier" });
    }

    const existingTicketCount = await Ticket.count({
      where: {
        eventId: event.id,
        ownerWallet: user.walletAddress,
      },
    });

    if (existingTicketCount + parsedQuantity > 3) {
      return res.status(400).json({ message: "Mỗi sự kiện chỉ được mua tối đa 3 vé" });
    }

    const availableTickets = Number(tier.maxSupply) - Number(tier.currentSupply);

    if (parsedQuantity > availableTickets) {
      return res.status(400).json({
        message: `Chỉ còn ${Math.max(availableTickets, 0)} vé cho sự kiện này`,
      });
    }

    if (Number(tier.currentSupply) >= Number(tier.maxSupply)) {
      return res.status(400).json({ message: "This event is sold out" });
    }

    const contract = getContract();
    const mintFunctionName = getMintFunctionName();

    const tickets = [];
    const transactionHashes = [];

    for (let index = 0; index < parsedQuantity; index += 1) {
      tx = await contract[mintFunctionName](user.walletAddress, String(event.id));
      const receipt = await tx.wait();
      const tokenId = extractMintedTokenId(receipt, contract, user.walletAddress);

      if (!tokenId || !/^\d+$/.test(tokenId)) {
        throw new Error("Unable to extract a numeric tokenId from the mint transaction");
      }

      const ticket = await Ticket.create({
        tierId: tier.id,
        eventId: event.id,
        tokenId,
        ownerWallet: user.walletAddress,
        transactionHash: tx.hash,
        status: "Valid",
        isUsed: false,
      });

      tickets.push(ticket);
      transactionHashes.push(tx.hash);
    }

    res.status(201).json({
      message:
        parsedQuantity > 1
          ? `Mua ${parsedQuantity} vé thành công.`
          : "Mua vé thành công.",
      tickets,
      transactionHashes,
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

    if (ticket.isUsed || ticket.status === "Used") {
      return res.status(400).json({ message: "QR đã qua sử dụng" });
    }

    ticket.isUsed = true;
    ticket.status = "Used";
    await ticket.save();

    res.json({
      message: "Check-in thành công",
      ticket,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
