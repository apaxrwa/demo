# Demo APAX App

A Web3 demo of a precious-metals portfolio vault: a Next.js frontend, an Express + MongoDB API, and Solidity smart contracts.

## Stack

- **Frontend**: Next.js 16, React 19, Zustand, Zod
- **Backend**: Node.js + Express 5 + Mongoose + ethers
- **Smart contracts**: Solidity 0.8.28, Hardhat 3, OpenZeppelin 5

## Architecture

Frontend → Backend → Blockchain

- The frontend never talks to the blockchain directly.
- The backend serves holdings from MongoDB and indexes events from the gold token (APXG).
- The smart contract is the source of truth for token balances; the dashboard flags any
  difference between MongoDB holdings and on-chain balances (it never auto-corrects).

## Project Structure

```text
/
├── smart-contracts/        # Hardhat project
│   ├── contracts/          # ComplianceRegistry.sol, MetalToken.sol
│   ├── ignition/modules/   # MetalTokens.ts (registry + gold, silver, platinum tokens)
│   ├── scripts/            # metals-demo.ts (local demo data)
│   └── test/               # Mocha tests
└── web/                    # Next.js app + Express API
    ├── app/, components/, lib/   # Frontend
    ├── scripts/seed.ts     # Creates the demo user and holdings in MongoDB
    └── src/                # Express API, data stores, models, indexer
        └── config/.config.env    # Shared development settings (committed)
```

## Run locally

Requirements: Node.js 20+. Nothing else to install or configure.

```bash
cd web
npm install
npm run dev        # frontend on http://localhost:3000, API on http://localhost:4000
```

Open http://localhost:3000/login and sign in with the demo user:

- Email: `demo@apax.local`
- Password: `DemoPass123!`

### Where the data comes from

The API picks its data source when it starts:

- **MongoDB**, when `MONGO_URI` (or `MONGODB_URI`) is set and the server answers within 5 seconds.
- **Mock data** otherwise: if no connection string is set, or the database cannot be reached
  (wrong address, no internet, IP not allowed in MongoDB Atlas). The startup log says which one
  is in use, and `GET /health` reports it as `dataSource`.

Mock data lives in memory: the demo user and sample holdings are there on every start, and
anything you change (new accounts, profile edits) resets when the server restarts. The chain
indexer needs MongoDB, so with mock data the Proof of Reserve page shows sample entries.

### Settings

Development settings live in `web/src/config/.config.env`, which is committed so every
machine runs with the same configuration: the API port, the shared MongoDB Atlas cluster and
the development JWT secrets. **These values are development-only and visible to anyone with
access to the repo; never reuse them in production.**

To use different values on your machine, copy `web/.env.example` to `web/.env` (git-ignored)
and keep only the lines you want to change. It is loaded first, so anything in it overrides
`.config.env`; `web/.env.example` lists every supported setting. If the connection string names
no database, `apax` is used. After pointing at a new database, run `npm run seed` once to create
the demo user there.

### Production

In production (`NODE_ENV=production`) there is no mock fallback: the API refuses to start unless
`MONGO_URI` is reachable and `JWT_SECRET` and `JWT_REFRESH_SECRET` (at least 32 characters each)
are set. Set them as real environment variables with production values, not the development
ones from `.config.env`. Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Data routes return `503` while the database is disconnected; `GET /health` reports its status.
The API port is `API_PORT` (default 4000).

## Smart contracts

```bash
cd smart-contracts
npm install
npm test          # runs the ComplianceRegistry and MetalToken test suites
```

One `MetalToken` contract is deployed per metal: **APXG** (gold), **APXS** (silver) and
**APXP** (platinum). 1 token = 1 gram of allocated vault metal. All three check one shared
`ComplianceRegistry`, so approving or blocking an investor happens once for every token.

- Separate roles: compliance (on the registry), and minting, pausing and redemption (on each
  token). Admins receive only `DEFAULT_ADMIN_ROLE` at deployment.
- Only accounts on the registry's allowlist can hold or move tokens.
- `mintAgainstDeposit` requires a deposit reference and rejects any reference already used.
- Redemptions escrow the holder's tokens in the contract; the redeemer role burns them
  after delivery (`settleRedemption`), or the holder/redeemer cancels and gets them back.
  No role can burn a holder's balance directly.
- The token admin can point a token at a new registry; it must be a deployed contract.

## Optional: on-chain indexer and reconciliation (local chain)

```bash
# terminal 1
cd smart-contracts && npm run node
# terminal 2 – deploys the registry and the three metal tokens, allows the demo wallet,
# and mints its gold, silver and platinum
cd smart-contracts && npm run demo:metals
```

Copy the printed `RPC_URL`, `APX_GOLD_ADDRESS`, `INDEXER_START_BLOCK` and
`INDEXER_CONFIRMATIONS` values into `web/.env` and restart `npm run dev`. The API then:

- indexes gold token events into MongoDB (idempotent: one row per chain, tx hash and log index,
  with a stored block cursor so restarts resume where they stopped);
- shows those events in **Proof of Reserve** instead of the sample entries;
- compares the demo user's gold holdings with their wallet's APXG balance on the dashboard.

## Not implemented yet

- Wallet sign-in (the wallet buttons explain this and point to email sign-in).
- Indexing and reconciliation for silver and platinum (only the gold token is wired up so far).
- The APX-i index token.
- Live metal prices (the dashboard simulates price movement).
- Fine-grained reorg handling: the indexer waits `INDEXER_CONFIRMATIONS` blocks, and if the last
  block it indexed later changes (a deeper reorg, or a restarted local Hardhat node) it simply
  clears that contract's events and re-indexes from `INDEXER_START_BLOCK`.
