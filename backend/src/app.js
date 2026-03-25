require("dotenv").config();
const express = require("express");

const requiredEnvKeys = ["DATABASE_URL", "JWT_SECRET"];
const missingEnvKeys = requiredEnvKeys.filter((key) => !process.env[key]);

if (missingEnvKeys.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvKeys.join(", ")}`);
}

const { connectDB, sequelize } = require("./config/db");
require("./models");

const app = express();

app.use(express.json());

app.use("/auth", require("./routes/auth.routes"));
app.use("/events", require("./routes/event.routes"));
app.use("/tickets", require("./routes/ticket.routes"));

const startServer = async () => {
  try {
    await connectDB();
    await sequelize.sync({ alter: true });

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
