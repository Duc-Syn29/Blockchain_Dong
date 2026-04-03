const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Ticket = sequelize.define("Ticket", {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
    field: "TicketID",
  },
  tierId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: "TierID",
  },
  eventId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: "EventID",
  },
  orderId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: "OrderID",
  },
  tokenId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: "TokenID",
  },
  ownerWallet: {
    type: DataTypes.CHAR(42),
    allowNull: false,
    field: "OwnerWallet",
  },
  transactionHash: {
    type: DataTypes.CHAR(66),
    allowNull: false,
    unique: true,
    field: "MintTxHash",
  },
  metadataUri: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: "MetadataURI",
  },
  seatLabel: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: "SeatLabel",
  },
  isUsed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: "IsUsed",
  },
  usedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: "UsedAt",
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: "Valid",
    field: "Status",
  },
}, {
  tableName: "Tickets",
  timestamps: true,
  createdAt: "CreatedAt",
  updatedAt: "UpdatedAt",
});

module.exports = Ticket;
