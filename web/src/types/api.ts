// Response shapes shared with the frontend (web/lib/api-schemas.ts validates them).

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  avatarUrl?: string;
  walletAddress?: string;
}

export interface HoldingsResponse {
  goldGrams: number;
  silverGrams: number;
  platinumGrams: number;
  apxiTokens: number;
  updatedAt: string | null;
}

export interface ActivityItem {
  id: string;
  event: string;
  blockNumber: number;
  txHash: string;
  timestamp: string;
  account?: string;
  amount?: string;
  reference?: string;
}

export type ReconciliationStatus =
  | "not_configured"
  | "no_wallet"
  | "match"
  | "mismatch"
  | "unavailable";

export interface ReconciliationResponse {
  status: ReconciliationStatus;
  walletAddress?: string;
  offChainGrams: number;
  onChainGrams?: number;
  checkedAt: string;
}
