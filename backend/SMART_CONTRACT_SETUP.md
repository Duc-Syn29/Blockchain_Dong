# Smart Contract Setup

This project now includes a minimal ERC-721 ticket contract for testnet deployment.
The compile flow uses the local `solc` package so it can work without Hardhat downloading a compiler.

## Files

- `contracts/EventTicketNFT.sol`: NFT ticket smart contract
- `hardhat.config.js`: optional Hardhat configuration for later use
- `scripts/compile-contract.js`: compiles the contract locally with `solc`
- `scripts/deploy-contract.js`: deploys the contract and writes the ABI for the backend
- `scripts/export-contract-abi.js`: exports the ABI again after a new compile

## Required `.env` values

The deploy flow reuses the same environment file as the backend:

- `TESTNET_RPC_URL` or `RPC_URL`
- `DEPLOYER_PRIVATE_KEY` or a valid `PRIVATE_KEY`

After deployment, update `.env` with:

- `CONTRACT_ADDRESS=<deployed address>`
- `MINT_FUNCTION_NAME=mintTicket`

Optional values:

- `CONTRACT_NAME`
- `CONTRACT_SYMBOL`
- `BASE_TOKEN_URI`
- `CONTRACT_OWNER_ADDRESS`

## Commands

Install Solidity tooling:

```powershell
npm install
```

Compile the contract:

```powershell
npm run contract:compile
```

When deploying to Oasis Sapphire Testnet, compile with `EVM version = paris`.
This repository already does that for you because Sapphire does not support `PUSH0`
from `shanghai` and later EVM versions.

Deploy to the configured testnet:

```powershell
npm run contract:deploy:testnet
```

Export ABI again if needed:

```powershell
npm run contract:export-abi
```

## Backend integration

After a successful deploy:

1. Copy the printed `CONTRACT_ADDRESS` into `.env`
2. Keep `RPC_URL` and `PRIVATE_KEY` pointed at the same testnet/minter wallet
3. Restart the backend:

```powershell
node src/app.js
```

The backend will then read:

- `CONTRACT_ADDRESS` from `.env`
- ABI from `src/config/contractAbi.json`
