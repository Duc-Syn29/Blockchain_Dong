const { ethers } = require("ethers");
const fs = require("fs/promises");
const path = require("path");
const bcrypt = require("bcrypt");
const { Ticket, Event, TicketTier, User } = require("../models");
const { getContract, getMintFunctionName, getProvider } = require("../config/blockchain");
const {
  ticketPinStoreFile,
  paymentTransactionStoreFile,
} = require("../config/paths");
const { normalizeWalletAddress } = require("../utils/normalizers");
const { isTemporaryWalletAddress } = require("../utils/walletState");

const isEventClosed = (event) =>
  String(event?.status || "").trim() === "Cancelled" ||
  String(event?.visibility || "").trim() === "Unlisted";

const normalizeWalletKey = (value) => {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return "";
  }

  try {
    return normalizeWalletAddress(normalizedValue);
  } catch (error) {
    return normalizedValue.toLowerCase();
  }
};

const readJsonFile = async (filePath) => {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }

    throw error;
  }
};

const writeJsonFile = async (filePath, payload) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
};

const getTicketPinHash = async (walletAddress) => {
  const ticketPinStore = await readJsonFile(ticketPinStoreFile);
  return ticketPinStore[normalizeWalletKey(walletAddress)]?.ticketPinHash || null;
};

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

const getNativeCurrencySymbol = () => String(process.env.PAYMENT_NATIVE_SYMBOL || "TEST").trim() || "TEST";
const getNativeCurrencyDecimals = () => {
  const rawValue = String(process.env.PAYMENT_NATIVE_DECIMALS || "18").trim();
  const parsedValue = Number(rawValue);
  return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : 18;
};
const getNativeChainId = () => {
  const rawValue = String(process.env.PAYMENT_CHAIN_ID || "23295").trim();
  const parsedValue = Number(rawValue);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : 23295;
};

const formatTokenAmount = (amount, decimals) => ethers.formatUnits(amount, decimals);

const buildPurchaseSummary = (tier, quantity, organizerWallet) => {
  const symbol = getNativeCurrencySymbol();
  const decimals = getNativeCurrencyDecimals();
  const unitPrice = ethers.parseUnits(String(tier.price ?? 0), decimals);
  const totalAmount = unitPrice * BigInt(quantity);

  return {
    recipientAddress: organizerWallet,
    symbol,
    decimals,
    chainId: getNativeChainId(),
    quantity,
    unitPrice,
    totalAmount,
    unitPriceFormatted: formatTokenAmount(unitPrice, decimals),
    totalAmountFormatted: formatTokenAmount(totalAmount, decimals),
  };
};

const loadPurchasableEvent = async (eventId) => {
  const event = await Event.findByPk(eventId);
  if (!event) {
    return { event: null, tier: null };
  }

  const tier = await TicketTier.findOne({
    where: { eventId: event.id },
    order: [["id", "ASC"]],
  });

  return { event, tier };
};

const verifyNativePayment = async ({
  paymentTransactionHash,
  expectedBuyerWallet,
  expectedRecipientWallet,
  expectedAmount,
  expectedChainId,
}) => {
  const normalizedHash = String(paymentTransactionHash || "").trim().toLowerCase();

  if (!/^0x[a-f0-9]{64}$/.test(normalizedHash)) {
    throw new Error("paymentTransactionHash không hợp lệ");
  }

  const paymentStore = await readJsonFile(paymentTransactionStoreFile);
  if (paymentStore[normalizedHash]) {
    throw new Error("Giao dịch thanh toán này đã được dùng để mua vé trước đó");
  }

  const provider = getProvider();
  const [transaction, receipt, network] = await Promise.all([
    provider.getTransaction(normalizedHash),
    provider.getTransactionReceipt(normalizedHash),
    provider.getNetwork(),
  ]);

  if (!transaction || !receipt) {
    throw new Error("Không tìm thấy giao dịch thanh toán trên chuỗi");
  }

  if (receipt.status !== 1) {
    throw new Error("Giao dịch thanh toán chưa thành công");
  }

  if (Number(network.chainId) !== Number(expectedChainId)) {
    throw new Error(`Sai mạng giao dịch. Cần chain ${expectedChainId}`);
  }

  if (normalizeWalletKey(transaction.from) !== normalizeWalletKey(expectedBuyerWallet)) {
    throw new Error("Ví gửi giao dịch không khớp với ví người mua đã liên kết");
  }

  if (normalizeWalletKey(transaction.to) !== normalizeWalletKey(expectedRecipientWallet)) {
    throw new Error("Ví nhận giao dịch không khớp với ví ban tổ chức");
  }

  if ((transaction.data || "0x") !== "0x") {
    throw new Error("Giao dịch thanh toán native không hợp lệ");
  }

  if (BigInt(transaction.value.toString()) !== BigInt(expectedAmount.toString())) {
    throw new Error("Số tiền thanh toán không khớp với giá vé");
  }

  return {
    normalizedHash,
    paymentStore,
  };
};

exports.getPurchaseQuote = async (req, res) => {
  try {
    const { eventId, quantity } = req.body;
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

    const { event, tier } = await loadPurchasableEvent(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (isEventClosed(event)) {
      return res.status(400).json({ message: "Sự kiện này đã đóng và không còn mở bán" });
    }

    if (!tier) {
      return res.status(400).json({ message: "This event does not have a ticket tier" });
    }

    const availableTickets = Number(tier.maxSupply) - Number(tier.currentSupply);
    if (parsedQuantity > availableTickets) {
      return res.status(400).json({
        message: `Chỉ còn ${Math.max(availableTickets, 0)} vé cho sự kiện này`,
      });
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

    const summary = buildPurchaseSummary(tier, parsedQuantity, event.organizerId);

    return res.json({
      eventId: event.id,
      quantity: parsedQuantity,
      buyerWalletAddress: user.walletAddress,
      currency: summary.symbol,
      ...summary,
      unitPrice: summary.unitPrice.toString(),
      totalAmount: summary.totalAmount.toString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.buyTicket = async (req, res) => {
  let tx = null;

  try {
    const { eventId, walletAddress, quantity, ticketPin, paymentTransactionHash } = req.body;
    const parsedQuantity =
      quantity === undefined || quantity === null ? 1 : Number(quantity);

    if (!eventId) {
      return res.status(400).json({ message: "eventId is required" });
    }

    if (!paymentTransactionHash) {
      return res.status(400).json({ message: "paymentTransactionHash is required" });
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

    const ticketPinHash = await getTicketPinHash(user.walletAddress);
    if (!ticketPinHash) {
      return res.status(400).json({ message: "Vui lòng tạo mã PIN vé trong hồ sơ trước khi mua vé" });
    }

    const isTicketPinValid = await bcrypt.compare(String(ticketPin || ""), ticketPinHash);
    if (!isTicketPinValid) {
      return res.status(401).json({ message: "Mã PIN xác thực giao dịch không đúng" });
    }

    if (walletAddress) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);

      if (normalizedWalletAddress !== normalizeWalletKey(user.walletAddress)) {
        return res.status(403).json({ message: "You can only buy tickets with your own wallet" });
      }
    }

    const { event, tier } = await loadPurchasableEvent(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (isEventClosed(event)) {
      return res.status(400).json({ message: "Sự kiện này đã đóng và không còn mở bán" });
    }

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

    const paymentSummary = buildPurchaseSummary(tier, parsedQuantity, event.organizerId);
    const { normalizedHash, paymentStore } = await verifyNativePayment({
      paymentTransactionHash,
      expectedBuyerWallet: user.walletAddress,
      expectedRecipientWallet: event.organizerId,
      expectedAmount: paymentSummary.totalAmount,
      expectedChainId: paymentSummary.chainId,
    });

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

    paymentStore[normalizedHash] = {
      eventId: event.id,
      buyerWalletAddress: normalizeWalletKey(user.walletAddress),
      recipientWalletAddress: normalizeWalletKey(event.organizerId),
      quantity: parsedQuantity,
      totalAmount: paymentSummary.totalAmount.toString(),
      usedAt: new Date().toISOString(),
      mintTransactionHashes: transactionHashes,
    };
    await writeJsonFile(paymentTransactionStoreFile, paymentStore);

    res.status(201).json({
      message:
        parsedQuantity > 1
          ? `Mua ${parsedQuantity} vé thành công.`
          : "Mua vé thành công.",
      tickets,
      payment: {
        symbol: paymentSummary.symbol,
        decimals: paymentSummary.decimals,
        chainId: paymentSummary.chainId,
        quantity: parsedQuantity,
        unitPrice: paymentSummary.unitPrice.toString(),
        totalAmount: paymentSummary.totalAmount.toString(),
        unitPriceFormatted: paymentSummary.unitPriceFormatted,
        totalAmountFormatted: paymentSummary.totalAmountFormatted,
        recipientAddress: paymentSummary.recipientAddress,
        paymentTransactionHash: normalizedHash,
      },
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

    if (
      req.user.role === "organizer" &&
      normalizeWalletKey(ticket.Event?.organizerId) !== normalizeWalletKey(req.user.id)
    ) {
      return res
        .status(403)
        .json({ message: "You can only check in tickets for events you organize" });
    }

    if (ticket.isUsed || ticket.status === "Used") {
      return res.status(400).json({ message: "QR đã qua sử dụng" });
    }

    ticket.isUsed = true;
    ticket.status = "Used";
    ticket.usedAt = new Date();
    await ticket.save();

    res.json({
      message: "Check-in thành công",
      ticket,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
