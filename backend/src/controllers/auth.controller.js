const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { normalizeEmail, normalizeWalletAddress } = require("../utils/normalizers");
const { toAppRole, toDbRole } = require("../utils/roleMapping");

const mapUserResponse = (user) => ({
  id: user.walletAddress,
  name: user.name,
  email: user.email,
  role: toAppRole(user.role),
  walletAddress: user.walletAddress,
});

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, walletAddress } = req.body;
    const normalizedName = String(name || "").trim();
    const normalizedEmail = normalizeEmail(email);
    let normalizedWalletAddress = null;

    try {
      normalizedWalletAddress = normalizeWalletAddress(walletAddress);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    if (!normalizedName || !normalizedEmail || !password || !normalizedWalletAddress) {
      return res.status(400).json({
        message: "Name, email, password and wallet address are required",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingByEmail = await User.findOne({ where: { email: normalizedEmail } });
    if (existingByEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const existingByWallet = await User.findByPk(normalizedWalletAddress);
    if (existingByWallet) {
      return res.status(400).json({ message: "Wallet address already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      walletAddress: normalizedWalletAddress,
      name: normalizedName,
      email: normalizedEmail,
      password: hash,
      role: toDbRole(role),
      accountStatus: "Active",
    });

    res.status(201).json({
      message: "Register success",
      user: mapUserResponse(user),
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

    if (user.accountStatus !== "Active") {
      return res.status(403).json({ message: "Account is not active" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Wrong password" });
    }

    await user.update({
      lastLoginAt: new Date(),
    });

    const token = jwt.sign(
      { id: user.walletAddress, role: toAppRole(user.role) },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login success",
      token,
      user: mapUserResponse(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user: mapUserResponse(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updates = {};

    if (req.body.name !== undefined) {
      const normalizedName = String(req.body.name || "").trim();

      if (!normalizedName) {
        return res.status(400).json({ message: "Name cannot be empty" });
      }

      updates.name = normalizedName;
    }

    if (req.body.walletAddress !== undefined) {
      let normalizedWalletAddress = null;

      try {
        normalizedWalletAddress = normalizeWalletAddress(req.body.walletAddress);
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }

      if (normalizedWalletAddress !== user.walletAddress) {
        return res.status(400).json({
          message: "Wallet address is fixed by the Ticket.sql schema and cannot be changed",
        });
      }
    }

    await user.update(updates);

    res.json({
      message: "Profile updated",
      user: mapUserResponse(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
