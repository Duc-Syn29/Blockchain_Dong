const { Sequelize } = require("sequelize");

const buildDatabaseUrlFromParts = () => {
  const host = String(process.env.DB_HOST || "").trim();
  const port = String(process.env.DB_PORT || "3306").trim();
  const database = String(process.env.DB_NAME || "").trim();
  const user = String(process.env.DB_USER || "").trim();
  const password = String(process.env.DB_PASSWORD || "").trim();

  if (!host || !database || !user) {
    return "";
  }

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  const encodedDatabase = encodeURIComponent(database);

  return `mysql://${encodedUser}:${encodedPassword}@${host}:${port}/${encodedDatabase}`;
};

const databaseUrl = String(process.env.DATABASE_URL || "").trim() || buildDatabaseUrlFromParts();

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL or DB_HOST/DB_NAME/DB_USER/DB_PASSWORD environment variables");
}

if (!databaseUrl.startsWith("mysql://")) {
  throw new Error("DATABASE_URL must use the mysql:// protocol for this project");
}

const sequelize = new Sequelize(databaseUrl, {
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
