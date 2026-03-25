require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const writeJsonFile = (filePath, data) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

async function main() {
  const artifactPath = path.join(
    process.cwd(),
    "artifacts",
    "contracts",
    "EventTicketNFT.sol",
    "EventTicketNFT.json"
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error("Contract artifact not found. Run `npm run contract:compile` first.");
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const contractName = process.env.CONTRACT_NAME || "Event Ticket NFT";
  const contractSymbol = process.env.CONTRACT_SYMBOL || "ETIX";
  const baseTokenURI = process.env.BASE_TOKEN_URI || "";
  const rpcUrl = process.env.TESTNET_RPC_URL || process.env.RPC_URL;
  const rawPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY || "";
  const privateKey =
    rawPrivateKey && !rawPrivateKey.startsWith("0x") ? `0x${rawPrivateKey}` : rawPrivateKey;

  if (!rpcUrl) {
    throw new Error("Missing TESTNET_RPC_URL or RPC_URL in .env");
  }

  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    throw new Error("DEPLOYER_PRIVATE_KEY or PRIVATE_KEY must be a valid 32-byte private key");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const deployer = new ethers.Wallet(privateKey, provider);
  const initialOwner = process.env.CONTRACT_OWNER_ADDRESS || deployer.address;

  console.log(`Deploying with wallet: ${deployer.address}`);
  console.log(`RPC: ${rpcUrl}`);
  console.log(`Contract owner: ${initialOwner}`);

  const contractFactory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    deployer
  );
  const contract = await contractFactory.deploy(
    contractName,
    contractSymbol,
    baseTokenURI,
    initialOwner
  );

  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  const deploymentData = {
    network: "testnet",
    contractName: "EventTicketNFT",
    contractAddress,
    deployer: deployer.address,
    owner: initialOwner,
    deployedAt: new Date().toISOString(),
  };

  writeJsonFile(
    path.join(process.cwd(), "deployments", "testnet.json"),
    deploymentData
  );

  writeJsonFile(
    path.join(process.cwd(), "src", "config", "contractAbi.json"),
    artifact.abi
  );

  console.log("Contract deployed successfully");
  console.log(`Contract address: ${contractAddress}`);
  console.log("ABI exported to src/config/contractAbi.json");
  console.log("Update your .env with:");
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);
  console.log("MINT_FUNCTION_NAME=mintTicket");
}

main().catch((error) => {
  console.error("Contract deployment failed:", error);
  process.exitCode = 1;
});
