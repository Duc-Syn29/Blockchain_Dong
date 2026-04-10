const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { normalizeEmail, normalizeWalletAddress } = require("../utils/normalizers");
const { toAppRole, toDbRole } = require("../utils/roleMapping");
const {
  generateTemporaryWalletAddress,
  isTemporaryWalletAddress,
} = require("../utils/walletState");

const mapUserResponse = (user) => {
  const walletLinked = !isTemporaryWalletAddress(user.walletAddress);

  return {
    id: user.walletAddress,
    name: user.name,
    email: user.email,
    role: toAppRole(user.role),
    walletAddress: walletLinked ? user.walletAddress : null,
    walletLinked,
  };
};

const issueAuthToken = (user) =>
  jwt.sign(
    { id: user.walletAddress, role: toAppRole(user.role) },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, walletAddress } = req.body;
    const normalizedName = String(name || "").trim();
    const normalizedEmail = normalizeEmail(email);
    let normalizedWalletAddress = null;

    if (walletAddress) {
      try {
        normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }
    }

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({
        message: "Tên, email và mật khẩu là bắt buộc",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
    }

    const existingByEmail = await User.findOne({ where: { email: normalizedEmail } });
    if (existingByEmail) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    if (normalizedWalletAddress) {
      const existingByWallet = await User.findByPk(normalizedWalletAddress);
      if (existingByWallet) {
        return res.status(400).json({ message: "Địa chỉ ví đã tồn tại" });
      }
    } else {
      let nextTemporaryWalletAddress = generateTemporaryWalletAddress();
      let existingTemporaryWallet = await User.findByPk(nextTemporaryWalletAddress);

      while (existingTemporaryWallet) {
        nextTemporaryWalletAddress = generateTemporaryWalletAddress();
        existingTemporaryWallet = await User.findByPk(nextTemporaryWalletAddress);
      }

      normalizedWalletAddress = nextTemporaryWalletAddress;
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
      message: "Đăng ký thành công",
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
      return res.status(400).json({ message: "Email và mật khẩu là bắt buộc" });
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

    const token = issueAuthToken(user);

    res.json({
      message: "Đăng nhập thành công",
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
      return res.status(400).json({
        message: "Hãy dùng nút liên kết MetaMask để liên kết ví",
      });
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

exports.linkWallet = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!isTemporaryWalletAddress(user.walletAddress)) {
      return res.status(400).json({ message: "Tài khoản đã liên kết ví rồi" });
    }

    let normalizedWalletAddress = null;

    try {
      normalizedWalletAddress = normalizeWalletAddress(req.body.walletAddress);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    if (!normalizedWalletAddress) {
      return res.status(400).json({ message: "Địa chỉ ví là bắt buộc" });
    }

    const existingUser = await User.findByPk(normalizedWalletAddress);
    if (existingUser && existingUser.walletAddress !== user.walletAddress) {
      return res.status(400).json({ message: "Ví này đã được liên kết với tài khoản khác" });
    }

    await user.update({
      walletAddress: normalizedWalletAddress,
    });

    const token = issueAuthToken(user);

    res.json({
      message: "Liên kết ví MetaMask thành công",
      token,
      user: mapUserResponse(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
