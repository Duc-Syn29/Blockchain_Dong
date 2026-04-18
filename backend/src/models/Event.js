const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Event = sequelize.define("Event", {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
    field: "EventID",
  },
  organizerId: {
    type: DataTypes.CHAR(42),
    allowNull: false,
    field: "OrganizerWallet",
  },
  contractAddress: {
    type: DataTypes.CHAR(42),
    allowNull: true,
    field: "ContractAddress",
  },
  chainId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: "ChainID",
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: "Title",
  },
  slug: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    field: "Slug",
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: "Description",
  },
  posterUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: "PosterURL",
  },
  venueName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: "VenueName",
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: "Location",
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    field: "StartTime",
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: "EndTime",
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: "Published",
    field: "Status",
  },
  visibility: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: "Public",
    field: "Visibility",
  },
  totalTickets: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: "Capacity",
  },
  royaltyFee: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
    field: "RoyaltyFee",
  },
  isRefundable: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: "IsRefundable",
  },
  refundPolicy: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: "RefundPolicy",
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: "PublishedAt",
  },
}, {
  tableName: "Events",
  timestamps: true,
  createdAt: "CreatedAt",
  updatedAt: "UpdatedAt",
});

module.exports = Event;
