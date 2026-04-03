const User = require("./User");
const Event = require("./Event");
const TicketTier = require("./TicketTier");
const Ticket = require("./Ticket");

User.hasMany(Event, {
  foreignKey: "organizerId",
  sourceKey: "walletAddress",
});
Event.belongsTo(User, {
  foreignKey: "organizerId",
  targetKey: "walletAddress",
  as: "Organizer",
});

Event.hasMany(TicketTier, { foreignKey: "eventId", as: "ticketTiers" });
TicketTier.belongsTo(Event, { foreignKey: "eventId" });

Event.hasMany(Ticket, { foreignKey: "eventId" });
Ticket.belongsTo(Event, { foreignKey: "eventId" });

TicketTier.hasMany(Ticket, { foreignKey: "tierId" });
Ticket.belongsTo(TicketTier, { foreignKey: "tierId" });

User.hasMany(Ticket, {
  foreignKey: "ownerWallet",
  sourceKey: "walletAddress",
});
Ticket.belongsTo(User, {
  foreignKey: "ownerWallet",
  targetKey: "walletAddress",
  as: "Owner",
});

module.exports = { User, Event, TicketTier, Ticket };
