const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const TicketTier = sequelize.define("TicketTier", {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
    field: "TierID",
  },
  eventId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: "EventID",
  },
  tierName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: "TierName",
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: "Description",
  },
  maxSupply: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: "MaxSupply",
  },
  currentSupply: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: "CurrentSupply",
  },
  price: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    field: "Price",
  },
  currency: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: "ETH",
    field: "Currency",
  },
  perWalletLimit: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: "PerWalletLimit",
  },
  transferable: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: "Transferable",
  },
  metadataUri: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: "MetadataURI",
  },
  saleStartTime: {
    type: DataTypes.DATE,
    allowNull: false,
    field: "SaleStartTime",
  },
  saleEndTime: {
    type: DataTypes.DATE,
    allowNull: false,
    field: "SaleEndTime",
  },
}, {
  tableName: "Ticket_Tiers",
  timestamps: true,
  createdAt: "CreatedAt",
  updatedAt: "UpdatedAt",
});

module.exports = TicketTier;
