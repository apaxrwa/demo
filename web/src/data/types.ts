import type { ActivityItem, HoldingsResponse } from "../types/api";

export type UserRole = "user" | "admin";
export const USER_ROLES: readonly UserRole[] = ["user", "admin"];

export const ASSETS = ["gold", "silver", "platinum", "apxi"] as const;
export type Asset = (typeof ASSETS)[number];

/** A user as the API sees it, independent of where it is stored. */
export interface UserRecord {
  id: string;
  name: string;
  email: string;
  gender: string;
  role: UserRole;
  passwordHash: string;
  avatar?: { public_id?: string; url?: string };
  walletAddress?: string;
  refreshTokenHash?: string;
  resetPasswordTokenHash?: string;
  resetPasswordExpire?: Date;
  createdAt: Date;
}

export type NewUser = Pick<UserRecord, "name" | "email" | "gender" | "passwordHash"> &
  Partial<Pick<UserRecord, "role" | "avatar" | "walletAddress">>;

/** Fields set to `undefined` are removed from the stored user. */
export type UserPatch = Partial<Omit<UserRecord, "id" | "createdAt">>;

export interface UserStore {
  findById(id: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findByRefreshTokenHash(id: string, hash: string): Promise<UserRecord | null>;
  findByResetTokenHash(hash: string, now: Date): Promise<UserRecord | null>;
  list(): Promise<UserRecord[]>;
  create(user: NewUser): Promise<UserRecord>;
  update(id: string, patch: UserPatch): Promise<UserRecord | null>;
  clearRefreshTokenHash(hash: string): Promise<void>;
  delete(id: string): Promise<boolean>;
}

export interface HoldingStore {
  getForUser(userId: string): Promise<HoldingsResponse>;
  setForUser(userId: string, amounts: Partial<Record<Asset, number>>): Promise<void>;
}

export interface ActivityStore {
  /** Latest indexed events for one contract, so events from other chains or old deployments never show. */
  latest(contractAddress: string, limit: number): Promise<ActivityItem[]>;
}

export interface DataStores {
  source: "mongodb" | "mock";
  users: UserStore;
  holdings: HoldingStore;
  activity: ActivityStore;
}

/** Thrown when a unique field (for example the email) is already taken. */
export class DuplicateKeyError extends Error {}
