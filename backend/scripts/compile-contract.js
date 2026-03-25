const fs = require("fs");
const path = require("path");
const solc = require("solc");

const projectRoot = process.cwd();
const sourceName = "contracts/EventTicketNFT.sol";
const contractName = "EventTicketNFT";
const contractFilePath = path.join(projectRoot, sourceName);

if (!fs.existsSync(contractFilePath)) {
  console.error(`Contract file not found: ${contractFilePath}`);
  process.exit(1);
}

const findImports = (importPath) => {
  const candidatePaths = [
    path.join(projectRoot, importPath),
    path.join(projectRoot, "node_modules", importPath),
  ];

  for (const candidatePath of candidatePaths) {
    if (fs.existsSync(candidatePath)) {
      return { contents: fs.readFileSync(candidatePath, "utf8") };
    }
  }

  return { error: `File not found: ${importPath}` };
};

const input = {
  language: "Solidity",
  sources: {
    [sourceName]: {
      content: fs.readFileSync(contractFilePath, "utf8"),
    },
  },
  settings: {
    evmVersion: "paris",
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
const diagnostics = output.errors || [];
const fatalErrors = diagnostics.filter((entry) => entry.severity === "error");

for (const diagnostic of diagnostics) {
  console.log(`${diagnostic.severity.toUpperCase()}: ${diagnostic.formattedMessage}`);
}

if (fatalErrors.length > 0) {
  process.exit(1);
}

const compiledContract = output.contracts?.[sourceName]?.[contractName];

if (!compiledContract) {
  console.error("Compiled contract output not found.");
  process.exit(1);
}

const artifact = {
  contractName,
  sourceName,
  abi: compiledContract.abi,
  bytecode: `0x${compiledContract.evm.bytecode.object}`,
  deployedBytecode: `0x${compiledContract.evm.deployedBytecode.object}`,
};

const artifactPath = path.join(
  projectRoot,
  "artifacts",
  "contracts",
  "EventTicketNFT.sol",
  "EventTicketNFT.json"
);

fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));

const abiOutputPath = path.join(projectRoot, "src", "config", "contractAbi.json");
fs.mkdirSync(path.dirname(abiOutputPath), { recursive: true });
fs.writeFileSync(abiOutputPath, JSON.stringify(artifact.abi, null, 2));

console.log(`Contract compiled successfully: ${artifactPath}`);
console.log(`ABI exported to ${abiOutputPath}`);
