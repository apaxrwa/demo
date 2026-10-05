import crypto from "crypto";
import bcrypt from "bcryptjs";
import { toHoldingsResponse } from "./holdingsShape";
import {
  DEMO_EMAIL,
  DEMO_HOLDINGS,
  DEMO_NAME,
  DEMO_PASSWORD,
  DEMO_WALLET,
} from "./demoData";
import { Asset, DataStores, DuplicateKeyError, UserRecord } from "./types";

/**
 * Mock data used when MongoDB is not configured or not reachable. Everything lives in
 * process memory and resets on restart; it starts with the demo user and holdings.
 */
export const createMemoryStores = (): DataStores => {
  const users = new Map<string, UserRecord>();
  const holdings = new Map<string, Map<Asset, { amount: number; updatedAt: Date }>>();

  const copy = (user: UserRecord | undefined): UserRecord | null =>
    user ? { ...user, avatar: user.avatar && { ...user.avatar } } : null;

  const emailTaken = (email: string, exceptId?: string) =>
    [...users.values()].some((user) => user.email === email && user.id !== exceptId);

  const setHoldings = (userId: string, amounts: Partial<Record<Asset, number>>) => {
    const rows = holdings.get(userId) ?? new Map();
    for (const [asset, amount] of Object.entries(amounts) as [Asset, number][]) {
      rows.set(asset, { amount, updatedAt: new Date() });
    }
    holdings.set(userId, rows);
  };

  const demoId = crypto.randomBytes(12).toString("hex");
  users.set(demoId, {
    id: demoId,
    name: DEMO_NAME,
    email: DEMO_EMAIL,
    gender: "other",
    role: "user",
    passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10),
    walletAddress: DEMO_WALLET,
    createdAt: new Date(),
  });
  setHoldings(demoId, DEMO_HOLDINGS);

  return {
    source: "mock",

    users: {
      async findById(id) {
        return copy(users.get(id));
      },
      async findByEmail(email) {
        return copy([...users.values()].find((user) => user.email === email));
      },
      async findByRefreshTokenHash(id, hash) {
        const user = users.get(id);
        return user?.refreshTokenHash === hash ? copy(user) : null;
      },
      async findByResetTokenHash(hash, now) {
        return copy(
          [...users.values()].find(
            (user) =>
              user.resetPasswordTokenHash === hash &&
              user.resetPasswordExpire !== undefined &&
              user.resetPasswordExpire > now
          )
        );
      },
      async list() {
        return [...users.values()].map((user) => copy(user)!);
      },
      async create(input) {
        if (emailTaken(input.email)) {
          throw new DuplicateKeyError("A record with that value already exists");
        }
        const id = crypto.randomBytes(12).toString("hex");
        const user: UserRecord = { role: "user", ...input, id, createdAt: new Date() };
        users.set(id, user);
        return copy(user)!;
      },
      async update(id, patch) {
        const user = users.get(id);
        if (!user) return null;
        if (patch.email && emailTaken(patch.email, id)) {
          throw new DuplicateKeyError("A record with that value already exists");
        }
        const updated: UserRecord = { ...user };
        for (const [key, value] of Object.entries(patch)) {
          if (value === undefined) {
            delete (updated as unknown as Record<string, unknown>)[key];
          } else {
            (updated as unknown as Record<string, unknown>)[key] = value;
          }
        }
        users.set(id, updated);
        return copy(updated);
      },
      async clearRefreshTokenHash(hash) {
        for (const user of users.values()) {
          if (user.refreshTokenHash === hash) {
            delete user.refreshTokenHash;
          }
        }
      },
      async delete(id) {
        holdings.delete(id);
        return users.delete(id);
      },
    },

    holdings: {
      async getForUser(userId) {
        const rows = [...(holdings.get(userId) ?? new Map()).entries()].map(([asset, row]) => ({
          asset,
          ...row,
        }));
        return toHoldingsResponse(rows);
      },
      async setForUser(userId, amounts) {
        setHoldings(userId, amounts);
      },
    },

    activity: {
      // No blockchain indexer runs without MongoDB; the frontend shows its sample entries.
      async latest() {
        return [];
      },
    },
  };
};
