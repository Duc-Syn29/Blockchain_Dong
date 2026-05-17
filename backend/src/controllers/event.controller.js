const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { sequelize } = require("../config/db");
const { Event, TicketTier, User } = require("../models");
const { eventUploadsDir } = require("../config/paths");
const { isTemporaryWalletAddress } = require("../utils/walletState");

const DEFAULT_EVENT_DURATION_MS = 2 * 60 * 60 * 1000;
const MIME_TYPE_TO_EXTENSION = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const FILE_EXTENSION_TO_UPLOAD_EXTENSION = {
  ".jpg": ".jpg",
  ".jpeg": ".jpg",
  ".png": ".png",
  ".webp": ".webp",
  ".gif": ".gif",
};

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 220);

const createUniqueSlug = async (title, excludedEventId = null) => {
  const baseSlug = slugify(title) || `event-${Date.now()}`;
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existingEvent = await Event.findOne({
      where: {
        slug,
        ...(excludedEventId ? { id: { [Op.ne]: excludedEventId } } : {}),
      },
    });

    if (!existingEvent) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
};

const sanitizeEventPayload = (payload = {}) => {
  const sanitizedPayload = {};

  if (payload.title !== undefined) {
    const title = String(payload.title).trim();

    if (!title) {
      throw new Error("Title is required");
    }

    sanitizedPayload.title = title;
  }

  if (payload.description !== undefined) {
    sanitizedPayload.description = String(payload.description).trim();
  }

  if (payload.introLine !== undefined) {
    const introLine = String(payload.introLine || "").trim();

    if (introLine.length > 255) {
      throw new Error("introLine is too long");
    }

    sanitizedPayload.introLine = introLine || null;
  }

  if (payload.posterUrl !== undefined) {
    const posterUrl = String(payload.posterUrl || "").trim();

    if (posterUrl.length > 500) {
      throw new Error("posterUrl is too long");
    }

    sanitizedPayload.posterUrl = posterUrl || null;
  }

  if (payload.date !== undefined) {
    const eventDate = new Date(payload.date);

    if (Number.isNaN(eventDate.getTime())) {
      throw new Error("Date is invalid");
    }

    sanitizedPayload.date = eventDate;
  }

  if (payload.location !== undefined) {
    sanitizedPayload.location = String(payload.location).trim() || "TBA";
  }

  if (payload.totalTickets !== undefined) {
    const totalTickets = Number(payload.totalTickets);

    if (!Number.isInteger(totalTickets) || totalTickets <= 0) {
      throw new Error("totalTickets must be a positive integer");
    }

    sanitizedPayload.totalTickets = totalTickets;
  }

  if (payload.price !== undefined) {
    const price = Number(payload.price);

    if (Number.isNaN(price) || price < 0) {
      throw new Error("price must be a non-negative number");
    }

    sanitizedPayload.price = price;
  }

  return sanitizedPayload;
};

const getTierForEvent = (event) => {
  const tiers = event.ticketTiers || [];
  return tiers[0] || null;
};

const mapEventResponse = (event) => {
  const tier = getTierForEvent(event);

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    introLine: event.venueName,
    posterUrl: event.posterUrl,
    date: event.date,
    location: event.location,
    totalTickets: tier ? Number(tier.maxSupply) : Number(event.totalTickets || 0),
    soldTickets: tier ? Number(tier.currentSupply) : 0,
    price: tier ? Number(tier.price) : 0,
    organizerId: event.organizerId,
    organizerName: event.Organizer?.name || null,
    organizerEmail: event.Organizer?.email || null,
    status: event.status,
    visibility: event.visibility,
    isClosed: isEventClosed(event),
  };
};

const getSaleStartTime = (eventDate) => {
  const now = Date.now();
  const saleEndTime = eventDate.getTime();
  const safeStartTime = Math.min(now, saleEndTime - 60 * 1000);

  return new Date(safeStartTime);
};

const buildPublicPosterUrl = (req, relativePath) => {
  const normalizedPath = String(relativePath || "").replace(/\\/g, "/");
  return `${req.protocol}://${req.get("host")}${normalizedPath}`;
};

const normalizeComparableWallet = (value) => String(value || "").trim().toLowerCase();
const isEventClosed = (event) =>
  String(event?.status || "").trim() === "Cancelled" ||
  String(event?.visibility || "").trim() === "Unlisted";

const loadEventWithTier = (eventId) =>
  Event.findByPk(eventId, {
    include: [
      {
        model: User,
        as: "Organizer",
        attributes: ["walletAddress", "name", "email"],
      },
      {
        model: TicketTier,
        as: "ticketTiers",
      },
    ],
  });

exports.createEvent = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    if (isTemporaryWalletAddress(req.user.id)) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Vui lòng liên kết ví MetaMask trước khi tạo sự kiện",
      });
    }

    const eventPayload = sanitizeEventPayload(req.body);

    if (!eventPayload.title || !eventPayload.date) {
      await transaction.rollback();
      return res.status(400).json({ message: "Title and date are required" });
    }

    if (!eventPayload.totalTickets) {
      await transaction.rollback();
      return res.status(400).json({ message: "totalTickets is required and must be greater than 0" });
    }

    const eventDate = eventPayload.date;
    const event = await Event.create(
      {
        title: eventPayload.title,
        slug: await createUniqueSlug(eventPayload.title),
        description: eventPayload.description || "",
        venueName: eventPayload.introLine || null,
        posterUrl: eventPayload.posterUrl || null,
        location: eventPayload.location || "TBA",
        date: eventDate,
        endDate: new Date(eventDate.getTime() + DEFAULT_EVENT_DURATION_MS),
        totalTickets: eventPayload.totalTickets,
        organizerId: req.user.id,
        status: "Published",
        visibility: "Public",
        publishedAt: new Date(),
      },
      { transaction }
    );

    await TicketTier.create(
      {
        eventId: event.id,
        tierName: "General Admission",
        description: eventPayload.title,
        maxSupply: eventPayload.totalTickets,
        price: eventPayload.price || 0,
        saleStartTime: getSaleStartTime(eventDate),
        saleEndTime: eventDate,
      },
      { transaction }
    );

    await transaction.commit();

    const createdEvent = await loadEventWithTier(event.id);

    res.status(201).json({
      message: "Event created",
      event: mapEventResponse(createdEvent),
    });
  } catch (err) {
    await transaction.rollback();
    res.status(400).json({ error: err.message });
  }
};

exports.uploadPoster = async (req, res) => {
  try {
    if (isTemporaryWalletAddress(req.user.id)) {
      return res.status(400).json({
        message: "Vui lòng liên kết ví MetaMask trước khi tải poster",
      });
    }

    const mimeType = String(req.headers["content-type"] || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    const encodedFileName = String(req.headers["x-file-name"] || "").trim();
    let uploadedFileName = encodedFileName;

    try {
      uploadedFileName = decodeURIComponent(encodedFileName);
    } catch (error) {
      uploadedFileName = encodedFileName;
    }

    uploadedFileName = uploadedFileName.toLowerCase();
    const fileExtension = path.extname(uploadedFileName);
    const extension =
      MIME_TYPE_TO_EXTENSION[mimeType] || FILE_EXTENSION_TO_UPLOAD_EXTENSION[fileExtension];

    if (!extension) {
      return res.status(400).json({
        message: "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF",
      });
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({
        message: "Không nhận được dữ liệu ảnh",
      });
    }

    await fs.mkdir(eventUploadsDir, { recursive: true });

    const fileName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    const targetPath = path.join(eventUploadsDir, fileName);
    await fs.writeFile(targetPath, req.body);

    const relativePath = `/uploads/events/${fileName}`;

    res.status(201).json({
      message: "Tải poster thành công",
      posterUrl: buildPublicPosterUrl(req, relativePath),
      posterPath: relativePath,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getEvents = async (req, res) => {
  try {
    const events = await Event.findAll({
      where: {
        status: "Published",
        visibility: "Public",
      },
      include: [
        {
          model: User,
          as: "Organizer",
          attributes: ["walletAddress", "name", "email"],
        },
        {
          model: TicketTier,
          as: "ticketTiers",
        },
      ],
      order: [["date", "ASC"]],
    });

    res.json(events.map(mapEventResponse));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const event = await loadEventWithTier(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(mapEventResponse(event));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateEvent = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    if (isTemporaryWalletAddress(req.user.id)) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Vui lòng liên kết ví MetaMask trước khi chỉnh sửa sự kiện",
      });
    }

    const event = await Event.findByPk(req.params.id, {
      include: [
        {
          model: TicketTier,
          as: "ticketTiers",
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!event) {
      await transaction.rollback();
      return res.status(404).json({ message: "Event not found" });
    }

    if (normalizeComparableWallet(event.organizerId) !== normalizeComparableWallet(req.user.id)) {
      await transaction.rollback();
      return res.status(403).json({ message: "You can only update your own events" });
    }

    const tier = getTierForEvent(event);

    if (!tier) {
      await transaction.rollback();
      return res.status(400).json({ message: "Event does not have a ticket tier" });
    }

    const eventPayload = sanitizeEventPayload(req.body);
    const nextDate = eventPayload.date || event.date;
    const nextTitle = eventPayload.title || event.title;
    const nextTotalTickets =
      eventPayload.totalTickets !== undefined
        ? eventPayload.totalTickets
        : Number(tier.maxSupply);

    if (Number(tier.currentSupply) > Number(nextTotalTickets)) {
      await transaction.rollback();
      return res.status(400).json({
        message: "totalTickets cannot be lower than the number of tickets already sold",
      });
    }

    const updates = {};

    if (eventPayload.title !== undefined) {
      updates.title = nextTitle;
      updates.slug = await createUniqueSlug(nextTitle, event.id);
    }

    if (eventPayload.description !== undefined) {
      updates.description = eventPayload.description;
    }

    if (eventPayload.introLine !== undefined) {
      updates.venueName = eventPayload.introLine;
    }

    if (eventPayload.posterUrl !== undefined) {
      updates.posterUrl = eventPayload.posterUrl;
    }

    if (eventPayload.location !== undefined) {
      updates.location = eventPayload.location;
    }

    if (eventPayload.date !== undefined) {
      updates.date = nextDate;
      updates.endDate = new Date(nextDate.getTime() + DEFAULT_EVENT_DURATION_MS);
    }

    if (eventPayload.totalTickets !== undefined) {
      updates.totalTickets = eventPayload.totalTickets;
    }

    await event.update(updates, { transaction });

    const tierUpdates = {
      description: nextTitle,
      maxSupply: nextTotalTickets,
      price:
        eventPayload.price !== undefined ? eventPayload.price : Number(tier.price),
    };

    if (eventPayload.date !== undefined) {
      tierUpdates.saleStartTime = getSaleStartTime(nextDate);
      tierUpdates.saleEndTime = nextDate;
    }

    await tier.update(tierUpdates, { transaction });

    await transaction.commit();

    const updatedEvent = await loadEventWithTier(event.id);

    res.json({
      message: "Event updated",
      event: mapEventResponse(updatedEvent),
    });
  } catch (err) {
    await transaction.rollback();
    res.status(400).json({ error: err.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    if (isTemporaryWalletAddress(req.user.id)) {
      return res.status(400).json({
        message: "Vui lòng liên kết ví MetaMask trước khi quản lý sự kiện",
      });
    }

    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (normalizeComparableWallet(event.organizerId) !== normalizeComparableWallet(req.user.id)) {
      return res.status(403).json({ message: "You can only delete your own events" });
    }

    await event.destroy();
    res.json({ message: "Event deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.closeEvent = async (req, res) => {
  try {
    if (isTemporaryWalletAddress(req.user.id)) {
      return res.status(400).json({
        message: "Vui lòng liên kết ví MetaMask trước khi quản lý sự kiện",
      });
    }

    const event = await Event.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: "Organizer",
          attributes: ["walletAddress", "name"],
        },
        {
          model: TicketTier,
          as: "ticketTiers",
        },
      ],
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (normalizeComparableWallet(event.organizerId) !== normalizeComparableWallet(req.user.id)) {
      return res.status(403).json({ message: "You can only close your own events" });
    }

    await event.update({
      status: "Cancelled",
      visibility: "Unlisted",
    });

    return res.json({
      message: "Đã đóng sự kiện và gỡ khỏi trang chủ",
      event: mapEventResponse(event),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.reopenEvent = async (req, res) => {
  try {
    if (isTemporaryWalletAddress(req.user.id)) {
      return res.status(400).json({
        message: "Vui lòng liên kết ví MetaMask trước khi quản lý sự kiện",
      });
    }

    const event = await Event.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: "Organizer",
          attributes: ["walletAddress", "name"],
        },
        {
          model: TicketTier,
          as: "ticketTiers",
        },
      ],
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (normalizeComparableWallet(event.organizerId) !== normalizeComparableWallet(req.user.id)) {
      return res.status(403).json({ message: "You can only reopen your own events" });
    }

    if (!isEventClosed(event)) {
      return res.status(400).json({ message: "Sự kiện này đang mở bán" });
    }

    if (new Date(event.date).getTime() <= Date.now()) {
      return res.status(400).json({
        message: "Chỉ có thể mở bán lại khi ngày sự kiện đã được chỉnh sang tương lai",
      });
    }

    const tier = getTierForEvent(event);
    if (tier) {
      await tier.update({
        saleStartTime: getSaleStartTime(new Date(event.date)),
        saleEndTime: new Date(event.date),
      });
    }

    await event.update({
      status: "Published",
      visibility: "Public",
      publishedAt: new Date(),
    });

    return res.json({
      message: "Đã mở bán lại sự kiện",
      event: mapEventResponse(event),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
