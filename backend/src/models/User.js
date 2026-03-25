const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const User = sequelize.define("User", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  walletAddress: { type: DataTypes.STRING, unique: true },
  role: { 
    type: DataTypes.ENUM("user", "organizer", "staff"), 
    defaultValue: "user" 
  }
});

module.exports = User;