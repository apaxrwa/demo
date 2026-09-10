import { network } from "hardhat";

// Local demo only: deploys the ComplianceRegistry and the gold, silver and platinum tokens,
// allows the demo wallet and mints the demo user's metal so the web app has data to
// reconcile and index. Run against a local node:  npx hardhat node  then
//   npx hardhat run scripts/metals-demo.ts --network localhost
const DEMO_WALLET = process.env.SEED_DEMO_WALLET ?? "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

const METALS = [
  { name: "APAX Gold", symbol: "APXG", grams: process.env.DEMO_GOLD_GRAMS ?? "156.75" },
  { name: "APAX Silver", symbol: "APXS", grams: "892.4" },
  { name: "APAX Platinum", symbol: "APXP", grams: "45.2" },
];

async function main() {
  const { ethers } = await network.create();
  const [deployer] = await ethers.getSigners();

  const registry = await ethers.deployContract("ComplianceRegistry", [deployer.address]);
  await registry.waitForDeployment();
  await (await registry.grantRole(await registry.COMPLIANCE_ROLE(), deployer.address)).wait();
  await (await registry.setAllowed(DEMO_WALLET, true)).wait();
  const registryAddress = await registry.getAddress();
  console.log(`ComplianceRegistry deployed at ${registryAddress}`);

  const addresses: Record<string, string> = {};
  for (const metal of METALS) {
    const token = await ethers.deployContract("MetalToken", [
      metal.name,
      metal.symbol,
      deployer.address,
      registryAddress,
    ]);
    await token.waitForDeployment();
    for (const role of ["MINTER_ROLE", "REDEEMER_ROLE", "PAUSER_ROLE"] as const) {
      await (await token.grantRole(await token[role](), deployer.address)).wait();
    }
    await (
      await token.mintAgainstDeposit(
        DEMO_WALLET,
        ethers.parseUnits(metal.grams, 18),
        ethers.encodeBytes32String(`DEMO-${metal.symbol}-1`)
      )
    ).wait();
    addresses[metal.symbol] = await token.getAddress();
    console.log(`${metal.symbol} deployed at ${addresses[metal.symbol]}; minted ${metal.grams} to ${DEMO_WALLET}`);
  }

  console.log("Add these to web/.env to enable the indexer and gold reconciliation:");
  console.log("  RPC_URL=http://127.0.0.1:8545");
  console.log(`  APX_GOLD_ADDRESS=${addresses.APXG}`);
  console.log("  INDEXER_START_BLOCK=0");
  console.log("  INDEXER_CONFIRMATIONS=0");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
