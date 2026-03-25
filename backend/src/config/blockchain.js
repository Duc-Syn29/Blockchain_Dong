const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

let cachedContract = null;

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

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);
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
};
