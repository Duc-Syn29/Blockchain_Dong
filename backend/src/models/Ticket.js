const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Ticket = sequelize.define("Ticket", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tokenId: { type: DataTypes.STRING, unique: true, allowNull: false },
  transactionHash: { type: DataTypes.STRING, unique: true, allowNull: false },
  eventId: { type: DataTypes.UUID, allowNull: false },
  ownerWallet: { type: DataTypes.STRING, allowNull: false },
  status: { 
    type: DataTypes.ENUM("VALID", "USED"), 
    defaultValue: "VALID" 
  }
});

module.exports = Ticket;
