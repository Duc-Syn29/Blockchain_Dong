require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");

const rpcUrl = process.env.TESTNET_RPC_URL || process.env.RPC_URL;
const rawPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY || "";
const normalizedPrivateKey =
  rawPrivateKey && !rawPrivateKey.startsWith("0x")
    ? `0x${rawPrivateKey}`
    : rawPrivateKey;
const hasValidPrivateKey = /^0x[a-fA-F0-9]{64}$/.test(normalizedPrivateKey);

const testnetNetwork =
  rpcUrl && hasValidPrivateKey
    ? {
        url: rpcUrl,
        accounts: [normalizedPrivateKey],
      }
    : undefined;

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "paris",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    ...(testnetNetwork ? { testnet: testnetNetwork } : {}),
  },
};
