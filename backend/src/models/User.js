const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const User = sequelize.define("User", {
  walletAddress: {
    type: DataTypes.CHAR(42),
    allowNull: false,
    primaryKey: true,
    field: "WalletAddress",
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: "Nonce",
  },
  role: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: "Attendee",
    field: "Role",
  },
  accountStatus: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: "Active",
    field: "AccountStatus",
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: "DisplayName",
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: "Email",
  },
  avatarUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: "AvatarURL",
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: "LastLoginAt",
  },
}, {
  tableName: "Users",
  timestamps: true,
  createdAt: "CreatedAt",
  updatedAt: "UpdatedAt",
});

module.exports = User;
