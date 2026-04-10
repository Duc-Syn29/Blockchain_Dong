const crypto = require("crypto");
const { ethers } = require("ethers");

const TEMP_WALLET_PREFIX = "0x000000000000000000000000";

const generateTemporaryWalletAddress = () => {
  const suffix = crypto.randomBytes(8).toString("hex");
  return ethers.getAddress(`${TEMP_WALLET_PREFIX}${suffix}`);
};

const isTemporaryWalletAddress = (walletAddress) =>
  String(walletAddress || "").toLowerCase().startsWith(TEMP_WALLET_PREFIX.toLowerCase());

module.exports = {
  generateTemporaryWalletAddress,
  isTemporaryWalletAddress,
};
