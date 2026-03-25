const { ethers } = require("ethers");

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const normalizeWalletAddress = (walletAddress) => {
  if (!walletAddress) {
    return null;
  }

  const trimmedWalletAddress = String(walletAddress).trim();

  if (!ethers.isAddress(trimmedWalletAddress)) {
    throw new Error("Wallet address is invalid");
  }

  return ethers.getAddress(trimmedWalletAddress);
};

module.exports = {
  normalizeEmail,
  normalizeWalletAddress,
};
