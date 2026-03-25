const { Sequelize } = require("sequelize");

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL environment variable");
}

// Sử dụng biến môi trường từ .env 
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("PostgreSQL connected via Sequelize");
  } catch (err) {
    console.error("Unable to connect to the database:", err);
    throw err;
  }
};

module.exports = { sequelize, connectDB };
