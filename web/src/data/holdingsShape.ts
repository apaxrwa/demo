import type { HoldingsResponse } from "../types/api";
import type { Asset } from "./types";

const FIELD_BY_ASSET: Record<Asset, keyof Omit<HoldingsResponse, "updatedAt">> = {
  gold: "goldGrams",
  silver: "silverGrams",
  platinum: "platinumGrams",
  apxi: "apxiTokens",
};

/** Builds the API response; assets without a row are reported as zero. */
export const toHoldingsResponse = (
  rows: { asset: Asset; amount: number; updatedAt: Date }[]
): HoldingsResponse => {
  const result: HoldingsResponse = {
    goldGrams: 0,
    silverGrams: 0,
    platinumGrams: 0,
    apxiTokens: 0,
    updatedAt: null,
  };

  for (const row of rows) {
    result[FIELD_BY_ASSET[row.asset]] = row.amount;
    const updatedAt = row.updatedAt.toISOString();
    if (!result.updatedAt || updatedAt > result.updatedAt) {
      result.updatedAt = updatedAt;
    }
  }

  return result;
};
