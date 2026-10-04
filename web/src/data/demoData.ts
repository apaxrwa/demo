import type { Asset } from "./types";

export const DEMO_EMAIL = (process.env.SEED_DEMO_EMAIL ?? "demo@apax.local").toLowerCase();
export const DEFAULT_DEMO_PASSWORD = "DemoPass123!";
export const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? DEFAULT_DEMO_PASSWORD;
export const DEMO_NAME = "John Doe";
// Hardhat's well-known local test account #1; only meaningful on a local chain.
export const DEMO_WALLET = (
  process.env.SEED_DEMO_WALLET ?? "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
).toLowerCase();

export const DEMO_HOLDINGS: Record<Asset, number> = {
  gold: 156.75,
  silver: 892.4,
  platinum: 45.2,
  apxi: 1250,
};

export const demoLoginHint = (): string =>
  process.env.SEED_DEMO_PASSWORD
    ? `${DEMO_EMAIL} (password from SEED_DEMO_PASSWORD)`
    : `${DEMO_EMAIL} / ${DEFAULT_DEMO_PASSWORD}`;
