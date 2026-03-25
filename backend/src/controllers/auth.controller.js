const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { normalizeEmail, normalizeWalletAddress } = require("../utils/normalizers");

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, walletAddress } = req.body;
    const normalizedName = String(name || "").trim();
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    let normalizedWalletAddress = null;

    try {
      normalizedWalletAddress = normalizeWalletAddress(walletAddress);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    if (normalizedWalletAddress) {
      const walletOwner = await User.findOne({ where: { walletAddress: normalizedWalletAddress } });
      if (walletOwner) {
        return res.status(400).json({ message: "Wallet address already exists" });
      }
    }

    const hash = await bcrypt.hash(password, 10);
    const safeRole = role === "organizer" ? "organizer" : "user";

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hash,
      role: safeRole,
      walletAddress: normalizedWalletAddress,
    });

    res.status(201).json({
      message: "Register success",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login success",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
