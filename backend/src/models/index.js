const User = require("./User");
const Event = require("./Event");
const Ticket = require("./Ticket");

// Một Organizer có nhiều Event
User.hasMany(Event, { foreignKey: "organizerId" });
Event.belongsTo(User, { foreignKey: "organizerId" });

// Một Event có nhiều Ticket
Event.hasMany(Ticket, { foreignKey: "eventId" });
Ticket.belongsTo(Event, { foreignKey: "eventId" });

module.exports = { User, Event, Ticket };