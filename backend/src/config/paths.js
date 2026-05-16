const path = require("path");

const projectRoot = path.resolve(__dirname, "../..");

const resolveDataPath = (envKey, fallbackRelativePath) => {
  const configuredPath = String(process.env[envKey] || "").trim();

  if (configuredPath) {
    return path.resolve(configuredPath);
  }

  return path.resolve(projectRoot, fallbackRelativePath);
};

const uploadsRoot = resolveDataPath("UPLOADS_DIR", "uploads");
const storageRoot = resolveDataPath("STORAGE_DIR", "storage");

module.exports = {
  projectRoot,
  uploadsRoot,
  storageRoot,
  avatarUploadsDir: path.join(uploadsRoot, "avatars"),
  eventUploadsDir: path.join(uploadsRoot, "events"),
  organizerSettingsFile: path.join(storageRoot, "organizer-profile-settings.json"),
  ticketPinStoreFile: path.join(storageRoot, "ticket-pin-settings.json"),
  paymentTransactionStoreFile: path.join(storageRoot, "payment-transactions.json"),
};
