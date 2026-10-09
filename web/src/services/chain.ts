import { ethers } from "ethers";
import { config } from "../config/env";

export const APX_GOLD_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "event Minted(address indexed to, uint256 amount, bytes32 indexed depositRef)",
  "event RedemptionRequested(uint256 indexed id, address indexed holder, uint256 amount)",
  "event RedemptionSettled(uint256 indexed id, address indexed holder, uint256 amount, bytes32 deliveryRef)",
  "event RedemptionCancelled(uint256 indexed id, address indexed holder, uint256 amount)",
  "event ComplianceRegistryUpdated(address indexed previousRegistry, address indexed newRegistry)",
  "event Paused(address account)",
  "event Unpaused(address account)",
];

let provider: ethers.JsonRpcProvider | null = null;
let contract: ethers.Contract | null = null;

export const getApxGold = () => {
  if (!config.chain.rpcUrl || !config.chain.apxGoldAddress) {
    throw new Error("Chain is not configured");
  }
  provider ??= new ethers.JsonRpcProvider(config.chain.rpcUrl);
  contract ??= new ethers.Contract(config.chain.apxGoldAddress, APX_GOLD_ABI, provider);
  return { provider, contract };
};

/** APXG has 18 decimals and 1 APXG = 1 gram, so balances convert directly to grams. */
export const getOnChainGoldGrams = async (wallet: string): Promise<number> => {
  const { contract } = getApxGold();
  const balance: bigint = await contract.balanceOf(wallet);
  return Number(ethers.formatUnits(balance, 18));
};
