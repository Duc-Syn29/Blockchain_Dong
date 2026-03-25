const Event = require("../models/Event");

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

  if (payload.date !== undefined) {
    const eventDate = new Date(payload.date);

    if (Number.isNaN(eventDate.getTime())) {
      throw new Error("Date is invalid");
    }

    sanitizedPayload.date = eventDate;
  }

  if (payload.location !== undefined) {
    sanitizedPayload.location = String(payload.location).trim();
  }

  if (payload.totalTickets !== undefined) {
    const totalTickets = Number(payload.totalTickets);

    if (!Number.isInteger(totalTickets) || totalTickets < 0) {
      throw new Error("totalTickets must be a non-negative integer");
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

exports.createEvent = async (req, res) => {
  try {
    const eventPayload = sanitizeEventPayload(req.body);

    if (!eventPayload.title || !eventPayload.date) {
      return res.status(400).json({ message: "Title and date are required" });
    }

    const event = await Event.create({
      ...eventPayload,
      organizerId: req.user.id,
    });

    res.status(201).json({ message: "Event created", event });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getEvents = async (req, res) => {
  try {
    const events = await Event.findAll({
      order: [["date", "ASC"]],
    });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (event.organizerId !== req.user.id) {
      return res.status(403).json({ message: "You can only update your own events" });
    }

    const eventPayload = sanitizeEventPayload(req.body);
    await event.update(eventPayload);

    res.json({ message: "Event updated", event });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (event.organizerId !== req.user.id) {
      return res.status(403).json({ message: "You can only delete your own events" });
    }

    await event.destroy();
    res.json({ message: "Event deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
