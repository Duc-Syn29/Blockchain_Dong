const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

let cachedContract = null;
let cachedProvider = null;
let cachedWallet = null;

const readContractAbi = () => {
  if (process.env.CONTRACT_ABI) {
    try {
      return JSON.parse(process.env.CONTRACT_ABI);
    } catch (error) {
      throw new Error("CONTRACT_ABI must be valid JSON");
    }
  }

  const abiFilePath = path.join(__dirname, "contractAbi.json");

  if (!fs.existsSync(abiFilePath)) {
    throw new Error(
      "Missing contract ABI. Set CONTRACT_ABI in .env or create src/config/contractAbi.json"
    );
  }

  try {
    return JSON.parse(fs.readFileSync(abiFilePath, "utf8"));
  } catch (error) {
    throw new Error("Unable to read src/config/contractAbi.json");
  }
};

const getMintFunctionName = () => process.env.MINT_FUNCTION_NAME || "mintTicket";

const getProvider = () => {
  if (cachedProvider) {
    return cachedProvider;
  }

  if (!process.env.RPC_URL) {
    throw new Error("Missing blockchain environment variable: RPC_URL");
  }

  cachedProvider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  return cachedProvider;
};

const getWallet = () => {
  if (cachedWallet) {
    return cachedWallet;
  }

  if (!process.env.PRIVATE_KEY) {
    throw new Error("Missing blockchain environment variable: PRIVATE_KEY");
  }

  cachedWallet = new ethers.Wallet(process.env.PRIVATE_KEY, getProvider());
  return cachedWallet;
};

const getContract = () => {
  if (cachedContract) {
    return cachedContract;
  }

  const requiredVars = ["RPC_URL", "PRIVATE_KEY", "CONTRACT_ADDRESS"];
  const missingVars = requiredVars.filter((envKey) => !process.env[envKey]);

  if (missingVars.length > 0) {
    throw new Error(`Missing blockchain environment variables: ${missingVars.join(", ")}`);
  }

  const abi = readContractAbi();

  if (!Array.isArray(abi) || abi.length === 0) {
    throw new Error("Contract ABI must be a non-empty JSON array");
  }

  const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, getWallet());
  const mintFunctionName = getMintFunctionName();

  if (typeof contract[mintFunctionName] !== "function") {
    throw new Error(`Contract does not expose "${mintFunctionName}"`);
  }

  cachedContract = contract;
  return cachedContract;
};

module.exports = {
  getContract,
  getMintFunctionName,
  getProvider,
  getWallet,
};
