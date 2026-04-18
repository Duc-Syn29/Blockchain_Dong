const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { normalizeEmail, normalizeWalletAddress } = require("../utils/normalizers");
const { toAppRole, toDbRole } = require("../utils/roleMapping");
const {
  generateTemporaryWalletAddress,
  isTemporaryWalletAddress,
} = require("../utils/walletState");

const AVATAR_UPLOAD_DIR = path.join(__dirname, "../../uploads/avatars");
const ORGANIZER_SETTINGS_FILE = path.join(__dirname, "../../storage/organizer-profile-settings.json");
const TICKET_PIN_STORE_FILE = path.join(__dirname, "../../storage/ticket-pin-settings.json");
const MIME_TYPE_TO_EXTENSION = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const normalizeWalletKey = (value) => {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return "";
  }

  try {
    return normalizeWalletAddress(normalizedValue);
  } catch (error) {
    return normalizedValue.toLowerCase();
  }
};

const getUserTicketPinHash = (user) => {
  if (!user) {
    return undefined;
  }

  if (typeof user.getDataValue === "function") {
    return user.getDataValue("ticketPinHash");
  }

  if (user.dataValues && Object.prototype.hasOwnProperty.call(user.dataValues, "ticketPinHash")) {
    return user.dataValues.ticketPinHash;
  }

  return user.ticketPinHash;
};

const mapUserResponse = (user) => {
  const normalizedWalletAddress = normalizeWalletKey(user.walletAddress);
  const appRole = toAppRole(user.role);
  const walletLinked = !isTemporaryWalletAddress(normalizedWalletAddress);
  const canUseTicketPin = appRole === "user";

  return {
    id: normalizedWalletAddress,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: appRole,
    walletAddress: walletLinked ? normalizedWalletAddress : null,
    walletLinked,
    hasTicketPin: canUseTicketPin ? Boolean(getUserTicketPinHash(user)) : false,
  };
};

const issueAuthToken = (user) =>
  jwt.sign(
    { id: normalizeWalletKey(user.walletAddress), role: toAppRole(user.role) },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

const buildPublicAvatarUrl = (req, relativePath) => {
  const normalizedRelativePath = String(relativePath || "").replace(/\\/g, "/");
  return `${req.protocol}://${req.get("host")}${normalizedRelativePath}`;
};

const readOrganizerSettingsStore = async () => {
  try {
    const raw = await fs.readFile(ORGANIZER_SETTINGS_FILE, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }

    throw error;
  }
};

const writeOrganizerSettingsStore = async (payload) => {
  await fs.mkdir(path.dirname(ORGANIZER_SETTINGS_FILE), { recursive: true });
  await fs.writeFile(ORGANIZER_SETTINGS_FILE, JSON.stringify(payload, null, 2), "utf8");
};

const readTicketPinStore = async () => {
  try {
    const raw = await fs.readFile(TICKET_PIN_STORE_FILE, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }

    throw error;
  }
};

const writeTicketPinStore = async (payload) => {
  await fs.mkdir(path.dirname(TICKET_PIN_STORE_FILE), { recursive: true });
  await fs.writeFile(TICKET_PIN_STORE_FILE, JSON.stringify(payload, null, 2), "utf8");
};

const isValidTicketPin = (value) => /^\d{4}$/.test(String(value || "").trim());

const attachTicketPinState = async (user) => {
  if (getUserTicketPinHash(user) !== undefined) {
    return user;
  }

  const ticketPinStore = await readTicketPinStore();
  user.setDataValue(
    "ticketPinHash",
    ticketPinStore[normalizeWalletKey(user.walletAddress)]?.ticketPinHash || null
  );
  return user;
};

const sanitizeOrganizerSettingsPayload = (payload = {}) => ({
  contactPhone: String(payload.contactPhone || "").trim().slice(0, 50),
  contactBio: String(payload.contactBio || "").trim().slice(0, 500),
  showEmailPublic: Boolean(payload.showEmailPublic),
  showWalletPublic: Boolean(payload.showWalletPublic),
  showAvatarPublic: Boolean(payload.showAvatarPublic),
});

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
    await attachTicketPinState(user);

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

    await attachTicketPinState(user);

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

    await attachTicketPinState(user);

    const updates = {};

    if (req.body.name !== undefined) {
      const normalizedName = String(req.body.name || "").trim();

      if (!normalizedName) {
        return res.status(400).json({ message: "Name cannot be empty" });
      }

      updates.name = normalizedName;
    }

    if (req.body.email !== undefined) {
      const normalizedEmail = normalizeEmail(req.body.email);

      if (!normalizedEmail) {
        return res.status(400).json({ message: "Email không được để trống" });
      }

      const existingByEmail = await User.findOne({ where: { email: normalizedEmail } });
      if (existingByEmail && existingByEmail.walletAddress !== user.walletAddress) {
        return res.status(400).json({ message: "Email đã được dùng bởi tài khoản khác" });
      }

      updates.email = normalizedEmail;
    }

    if (req.body.avatarUrl !== undefined) {
      const normalizedAvatarUrl = String(req.body.avatarUrl || "").trim();

      if (normalizedAvatarUrl.length > 500) {
        return res.status(400).json({ message: "Ảnh đại diện quá dài" });
      }

      updates.avatarUrl = normalizedAvatarUrl || null;
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

exports.uploadAvatar = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const mimeType = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    const fileBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "");

    if (!MIME_TYPE_TO_EXTENSION[mimeType]) {
      return res.status(400).json({ message: "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF" });
    }

    if (!fileBuffer.length) {
      return res.status(400).json({ message: "Chưa nhận được dữ liệu ảnh" });
    }

    await fs.mkdir(AVATAR_UPLOAD_DIR, { recursive: true });

    const fileExtension = MIME_TYPE_TO_EXTENSION[mimeType];
    const fileName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${fileExtension}`;
    const absoluteFilePath = path.join(AVATAR_UPLOAD_DIR, fileName);
    const relativeFilePath = `/uploads/avatars/${fileName}`;

    await fs.writeFile(absoluteFilePath, fileBuffer);

    return res.status(201).json({
      message: "Tải ảnh đại diện thành công",
      avatarUrl: buildPublicAvatarUrl(req, relativeFilePath),
      avatarPath: relativeFilePath,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getOrganizerSettings = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (toAppRole(user.role) !== "organizer") {
      return res.status(403).json({ message: "Chỉ ban tổ chức mới có cài đặt hồ sơ tổ chức" });
    }

    const settingsStore = await readOrganizerSettingsStore();
    const organizerSettings = settingsStore[normalizeWalletKey(user.walletAddress)] || {
      contactPhone: "",
      contactBio: "",
      showEmailPublic: true,
      showWalletPublic: true,
      showAvatarPublic: true,
    };

    return res.json({ settings: organizerSettings });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.updateOrganizerSettings = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (toAppRole(user.role) !== "organizer") {
      return res.status(403).json({ message: "Chỉ ban tổ chức mới có cài đặt hồ sơ tổ chức" });
    }

    const settingsStore = await readOrganizerSettingsStore();
    const nextSettings = sanitizeOrganizerSettingsPayload(req.body);

    settingsStore[normalizeWalletKey(user.walletAddress)] = nextSettings;
    await writeOrganizerSettingsStore(settingsStore);

    return res.json({
      message: "Đã lưu cài đặt hồ sơ ban tổ chức",
      settings: nextSettings,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.linkWallet = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await attachTicketPinState(user);

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

    const ticketPinStore = await readTicketPinStore();
    const currentWalletKey = normalizeWalletKey(user.walletAddress);
    const nextWalletKey = normalizeWalletKey(normalizedWalletAddress);

    if (ticketPinStore[currentWalletKey] && !ticketPinStore[nextWalletKey]) {
      ticketPinStore[nextWalletKey] = ticketPinStore[currentWalletKey];
      delete ticketPinStore[currentWalletKey];
      await writeTicketPinStore(ticketPinStore);
    }

    await user.update({
      walletAddress: normalizedWalletAddress,
    });
    user.setDataValue("ticketPinHash", ticketPinStore[nextWalletKey]?.ticketPinHash || null);

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

exports.updateTicketPin = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (toAppRole(user.role) !== "user") {
      return res.status(403).json({ message: "Chỉ tài khoản người dùng mới có thể tạo mã PIN vé" });
    }

    const nextPin = String(req.body.ticketPin || "").trim();
    const confirmPin = String(req.body.confirmTicketPin || "").trim();

    if (!isValidTicketPin(nextPin)) {
      return res.status(400).json({ message: "Mã PIN phải gồm đúng 4 chữ số" });
    }

    if (nextPin !== confirmPin) {
      return res.status(400).json({ message: "Xác nhận PIN không khớp" });
    }

    const ticketPinStore = await readTicketPinStore();
    const ticketPinHash = await bcrypt.hash(nextPin, 10);

    ticketPinStore[normalizeWalletKey(user.walletAddress)] = {
      ticketPinHash,
      updatedAt: new Date().toISOString(),
    };
    await writeTicketPinStore(ticketPinStore);

    user.setDataValue("ticketPinHash", ticketPinHash);

    return res.json({
      message: "Đã cập nhật mã PIN vé",
      user: mapUserResponse(user),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.verifyTicketPin = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (toAppRole(user.role) !== "user") {
      return res.status(403).json({ message: "Chỉ tài khoản người dùng mới dùng mã PIN vé" });
    }

    const ticketPin = String(req.body.ticketPin || "").trim();
    if (!isValidTicketPin(ticketPin)) {
      return res.status(400).json({ message: "Mã PIN phải gồm đúng 4 chữ số" });
    }

    const ticketPinStore = await readTicketPinStore();
    const ticketPinHash = ticketPinStore[normalizeWalletKey(user.walletAddress)]?.ticketPinHash || null;

    if (!ticketPinHash) {
      return res.status(400).json({ message: "Tài khoản chưa thiết lập mã PIN vé" });
    }

    const isMatched = await bcrypt.compare(ticketPin, ticketPinHash);
    if (!isMatched) {
      return res.status(401).json({ message: "Mã PIN không đúng" });
    }

    return res.json({ message: "Xác thực PIN thành công", verified: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
