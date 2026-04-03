const { Sequelize } = require("sequelize");

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL environment variable");
}

if (!process.env.DATABASE_URL.startsWith("mysql://")) {
  throw new Error("DATABASE_URL must use the mysql:// protocol for this project");
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "mysql",
  logging: false,
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("mysql connected via Sequelize");
  } catch (err) {
    console.error("Unable to connect to the database:", err);
    throw err;
  }
};

module.exports = { sequelize, connectDB };
