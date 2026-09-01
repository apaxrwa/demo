# APAX Smart Contracts

Smart contracts for the APAX precious-metal vault.

## Technologies

- Solidity 0.8.28
- Hardhat 3
- OpenZeppelin v5
- Ethers.js v6
- Hardhat Ignition

## Contracts

### ComplianceRegistry

One allowlist of verified investors shared by every metal token, so approving or blocking an
account happens once for gold, silver and platinum. Managed by the `COMPLIANCE_ROLE`; the admin
receives only `DEFAULT_ADMIN_ROLE` at deployment.

### MetalToken (APXG, APXS, APXP)

A vault-backed ERC-20 token where 1 token represents 1 gram of allocated metal. The same
contract is deployed once per metal: APAX Gold (APXG), APAX Silver (APXS) and APAX Platinum (APXP).

- Separate roles for minting, pausing and redemption; the admin receives only
  `DEFAULT_ADMIN_ROLE` at deployment.
- Only accounts allowed by the shared `ComplianceRegistry` can hold or move tokens.
- `mintAgainstDeposit` requires a vault deposit reference and rejects any reference already used.
- Redemptions escrow the holder's tokens in the contract; the redeemer role burns them after
  delivery (`settleRedemption`), or the holder/redeemer cancels and the tokens are returned.
- Emergency pause for transfers, mints and redemptions.
- The admin can point a token at a new registry (`setComplianceRegistry`); it must be a deployed contract.

## Commands

Compile

    npx hardhat compile

Test

    npx hardhat test

Local demo (deploys the registry and the three tokens, allows the demo wallet and mints its metal)

    npm run node            # terminal 1: local Hardhat chain
    npm run demo:metals     # terminal 2

Deploy with Ignition (admin and operator default to the deployer)

    npx hardhat ignition deploy ignition/modules/MetalTokens.ts --network localhost
    npx hardhat ignition deploy ignition/modules/MetalTokens.ts --network sepolia

On a public network, pass separate admin and operator addresses (ideally multisigs) through
Ignition parameters instead of using the deployer for both. Sepolia deploys and verification
need `SEPOLIA_RPC_URL`, `SEPOLIA_PRIVATE_KEY` and `ETHERSCAN_API_KEY`: copy `.env.example` to
`.env` (git-ignored) and fill them in. Local commands need none of them.

Verify

    npx hardhat verify --network sepolia <REGISTRY_ADDRESS> <ADMIN_ADDRESS>
    npx hardhat verify --network sepolia <TOKEN_ADDRESS> "APAX Gold" APXG <ADMIN_ADDRESS> <REGISTRY_ADDRESS>
