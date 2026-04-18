require("dotenv").config();
const express = require("express");
const path = require("path");

const requiredEnvKeys = ["DATABASE_URL", "JWT_SECRET"];
const missingEnvKeys = requiredEnvKeys.filter((key) => !process.env[key]);

if (missingEnvKeys.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvKeys.join(", ")}`);
}

const { connectDB, sequelize } = require("./config/db");
require("./models");

const app = express();
const defaultOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
const frontendOriginEnv = process.env.FRONTEND_ORIGIN || "";
const allowedOrigins = frontendOriginEnv
  ? frontendOriginEnv.split(",").map((origin) => origin.trim()).filter(Boolean)
  : defaultOrigins;

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const resolvedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  res.header("Access-Control-Allow-Origin", resolvedOrigin);
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-File-Name");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/auth", require("./routes/auth.routes"));
app.use("/events", require("./routes/event.routes"));
app.use("/tickets", require("./routes/ticket.routes"));
app.use("/organizer", require("./routes/organizer.routes"));

const startServer = async () => {
  try {
    await connectDB();

    if (process.env.DB_SYNC === "true") {
      await sequelize.sync();
    }

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start server:", error);
    process.exit(1);
  }
};

startServer();
