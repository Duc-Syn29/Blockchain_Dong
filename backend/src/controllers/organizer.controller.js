const { Op } = require("sequelize");
const { sequelize } = require("../config/db");
const { Event, Ticket, TicketTier, User } = require("../models");
const { isTemporaryWalletAddress } = require("../utils/walletState");
const isEventClosed = (event) =>
  String(event?.status || "").trim() === "Cancelled" ||
  String(event?.visibility || "").trim() === "Unlisted";

const getTierForEvent = (event) => {
  const tiers = event.ticketTiers || [];
  return tiers[0] || null;
};

const mapOrganizerEvent = async (event) => {
  const tier = getTierForEvent(event);
  const soldTickets = tier ? Number(tier.currentSupply) : 0;
  const totalTickets = tier ? Number(tier.maxSupply) : Number(event.totalTickets || 0);
  const price = tier ? Number(tier.price) : 0;
  const checkedInCount = await Ticket.count({
    where: {
      eventId: event.id,
      isUsed: true,
    },
  });

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    posterUrl: event.posterUrl,
    date: event.date,
    location: event.location,
    status: event.status,
    visibility: event.visibility,
    soldTickets,
    totalTickets,
    price,
    revenue: soldTickets * price,
    checkedInCount,
    isClosed: isEventClosed(event),
  };
};

exports.getOrganizerEvents = async (req, res) => {
  try {
    if (isTemporaryWalletAddress(req.user.id)) {
      return res.status(400).json({
        message: "Vui lòng liên kết ví MetaMask trước khi quản lý sự kiện",
      });
    }

    const organizerWallet = String(req.user.id || "").toLowerCase();
    const events = await Event.findAll({
      where: sequelize.where(
        sequelize.fn("LOWER", sequelize.col("OrganizerWallet")),
        organizerWallet
      ),
      include: [
        {
          model: TicketTier,
          as: "ticketTiers",
        },
      ],
      order: [["date", "ASC"]],
    });

    const payload = await Promise.all(events.map(mapOrganizerEvent));
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOrganizerEventTickets = async (req, res) => {
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

    if (String(event.organizerId).toLowerCase() !== String(req.user.id || "").toLowerCase()) {
      return res.status(403).json({ message: "You can only view tickets for your events" });
    }

    const tickets = await Ticket.findAll({
      where: { eventId: event.id },
      include: [
        {
          model: User,
          as: "Owner",
          attributes: ["walletAddress", "name", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOrganizerEventCheckins = async (req, res) => {
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

    if (String(event.organizerId).toLowerCase() !== String(req.user.id || "").toLowerCase()) {
      return res.status(403).json({ message: "You can only view check-ins for your events" });
    }

    const rows = await Ticket.findAll({
      attributes: [
        [sequelize.fn("DATE", sequelize.col("UsedAt")), "date"],
        [sequelize.fn("COUNT", sequelize.col("TicketID")), "count"],
      ],
      where: {
        eventId: event.id,
        isUsed: true,
        usedAt: { [Op.ne]: null },
      },
      group: [sequelize.fn("DATE", sequelize.col("UsedAt"))],
      order: [[sequelize.fn("DATE", sequelize.col("UsedAt")), "ASC"]],
      raw: true,
    });

    const result = rows.map((row) => ({
      date: row.date,
      count: Number(row.count),
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
