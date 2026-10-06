import { ethers } from "ethers";
import { config } from "../config/env";
import { getApxGold } from "../services/chain";
import Activity, { IActivity } from "../models/activityModel";
import SyncState from "../models/syncStateModel";

const BLOCK_RANGE = 2_000;

type ActivityFields = Pick<IActivity, "event" | "account" | "amount" | "reference">;

const decodeRef = (value: string): string => {
  try {
    return ethers.decodeBytes32String(value);
  } catch {
    return value;
  }
};

const grams = (value: bigint) => ethers.formatUnits(value, 18);

const toActivityFields = (event: ethers.LogDescription): ActivityFields | null => {
  const args = event.args;
  switch (event.name) {
    case "Minted":
      return { event: event.name, account: args.to, amount: grams(args.amount), reference: decodeRef(args.depositRef) };
    case "RedemptionRequested":
    case "RedemptionCancelled":
      return { event: event.name, account: args.holder, amount: grams(args.amount), reference: `redemption #${args.id}` };
    case "RedemptionSettled":
      return { event: event.name, account: args.holder, amount: grams(args.amount), reference: decodeRef(args.deliveryRef) };
    case "ComplianceRegistryUpdated":
      return { event: event.name, account: args.newRegistry, reference: "compliance registry" };
    case "Paused":
    case "Unpaused":
      return { event: event.name, account: args.account };
    default:
      return null;
  }
};

const syncOnce = async () => {
  const { provider, contract } = getApxGold();
  const chainId = Number((await provider.getNetwork()).chainId);
  const contractAddress = (await contract.getAddress()).toLowerCase();
  const key = `${chainId}:${contractAddress}`;

  const state = await SyncState.findOne({ key }).lean();
  const safeHead = (await provider.getBlockNumber()) - config.chain.confirmations;
  let fromBlock = state ? state.lastBlock + 1 : config.chain.startBlock;

  // If the last indexed block no longer exists or has a different hash, the chain was reset
  // (a restarted local node) or reorganised past the confirmation depth: index it again.
  if (state) {
    const cursorBlock = await provider.getBlock(state.lastBlock);
    if (!cursorBlock || cursorBlock.hash !== state.lastBlockHash) {
      console.warn(`Indexer: chain history changed at block ${state.lastBlock}; re-indexing from block ${config.chain.startBlock}`);
      await Activity.deleteMany({ chainId, contractAddress });
      await SyncState.deleteOne({ key });
      fromBlock = config.chain.startBlock;
    }
  }

  while (fromBlock <= safeHead) {
    const toBlock = Math.min(fromBlock + BLOCK_RANGE - 1, safeHead);
    const logs = await provider.getLogs({ address: contractAddress, fromBlock, toBlock });

    const timestamps = new Map<number, Date>();
    const operations = [];

    for (const log of logs) {
      const parsed = contract.interface.parseLog(log);
      const fields = parsed && toActivityFields(parsed);
      if (!fields) continue;

      if (!timestamps.has(log.blockNumber)) {
        const block = await provider.getBlock(log.blockNumber);
        timestamps.set(log.blockNumber, new Date(Number(block?.timestamp ?? 0) * 1000));
      }

      const identity = { chainId, txHash: log.transactionHash.toLowerCase(), logIndex: log.index };
      operations.push({
        updateOne: {
          filter: identity,
          update: {
            $setOnInsert: {
              ...identity,
              ...fields,
              contractAddress,
              blockNumber: log.blockNumber,
              timestamp: timestamps.get(log.blockNumber)!,
            },
          },
          upsert: true,
        },
      });
    }

    if (operations.length > 0) {
      await Activity.bulkWrite(operations, { ordered: false });
    }
    // Advance the cursor only after the whole range is stored.
    const lastBlockHash = (await provider.getBlock(toBlock))?.hash ?? undefined;
    await SyncState.updateOne({ key }, { $set: { lastBlock: toBlock, lastBlockHash } }, { upsert: true });
    fromBlock = toBlock + 1;
  }
};

let running = false;

export const startIndexer = () => {
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await syncOnce();
    } catch (error) {
      console.error("Indexer sync failed, retrying next poll:", (error as Error).message);
    } finally {
      running = false;
    }
  };

  console.log(`Indexer enabled for the gold token (APXG) at ${config.chain.apxGoldAddress}`);
  void tick();
  setInterval(tick, config.chain.pollMs).unref();
};
