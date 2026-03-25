const fs = require("fs");
const path = require("path");

const artifactPath = path.join(
  process.cwd(),
  "artifacts",
  "contracts",
  "EventTicketNFT.sol",
  "EventTicketNFT.json"
);

if (!fs.existsSync(artifactPath)) {
  console.error("Artifact not found. Run `npm run contract:compile` first.");
  process.exit(1);
}

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const outputPath = path.join(process.cwd(), "src", "config", "contractAbi.json");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(artifact.abi, null, 2));

console.log(`ABI exported to ${outputPath}`);
