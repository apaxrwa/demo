import { isValidObjectId } from "mongoose";
import User, { UserDocument } from "../models/userModel";
import Holding from "../models/holdingModel";
import Activity from "../models/activityModel";
import { toHoldingsResponse } from "./holdingsShape";
import {
  Asset,
  DataStores,
  DuplicateKeyError,
  UserPatch,
  UserRecord,
} from "./types";

const toRecord = (doc: UserDocument): UserRecord => ({
  id: String(doc._id),
  name: doc.name,
  email: doc.email,
  gender: doc.gender,
  role: doc.role,
  passwordHash: doc.password,
  avatar: doc.avatar,
  walletAddress: doc.walletAddress,
  refreshTokenHash: doc.refreshToken,
  resetPasswordTokenHash: doc.resetPasswordToken,
  resetPasswordExpire: doc.resetPasswordExpire,
  createdAt: doc.createdAt,
});

const FIELD_NAMES: Partial<Record<keyof UserPatch, keyof UserDocument>> = {
  passwordHash: "password",
  refreshTokenHash: "refreshToken",
  resetPasswordTokenHash: "resetPasswordToken",
};

const toUpdate = (patch: UserPatch) => {
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};
  for (const [key, value] of Object.entries(patch)) {
    const field = FIELD_NAMES[key as keyof UserPatch] ?? key;
    if (value === undefined) {
      $unset[field] = 1;
    } else {
      $set[field] = value;
    }
  }
  const update: { $set?: typeof $set; $unset?: typeof $unset } = {};
  if (Object.keys($set).length > 0) update.$set = $set;
  if (Object.keys($unset).length > 0) update.$unset = $unset;
  return update;
};

const rethrowDuplicate = (error: unknown): never => {
  if ((error as { code?: number })?.code === 11000) {
    throw new DuplicateKeyError("A record with that value already exists");
  }
  throw error;
};

export const createMongoStores = (): DataStores => ({
  source: "mongodb",

  users: {
    async findById(id) {
      if (!isValidObjectId(id)) return null;
      const doc = await User.findById(id).lean();
      return doc ? toRecord(doc) : null;
    },
    async findByEmail(email) {
      const doc = await User.findOne({ email }).lean();
      return doc ? toRecord(doc) : null;
    },
    async findByRefreshTokenHash(id, hash) {
      if (!isValidObjectId(id)) return null;
      const doc = await User.findOne({ _id: id, refreshToken: hash }).lean();
      return doc ? toRecord(doc) : null;
    },
    async findByResetTokenHash(hash, now) {
      const doc = await User.findOne({
        resetPasswordToken: hash,
        resetPasswordExpire: { $gt: now },
      }).lean();
      return doc ? toRecord(doc) : null;
    },
    async list() {
      const docs = await User.find().lean();
      return docs.map(toRecord);
    },
    async create(user) {
      try {
        const doc = await User.create({
          name: user.name,
          email: user.email,
          gender: user.gender,
          password: user.passwordHash,
          role: user.role,
          avatar: user.avatar,
          walletAddress: user.walletAddress,
        });
        return toRecord(doc.toObject());
      } catch (error) {
        return rethrowDuplicate(error);
      }
    },
    async update(id, patch) {
      if (!isValidObjectId(id)) return null;
      try {
        const doc = await User.findByIdAndUpdate(id, toUpdate(patch), {
          new: true,
          runValidators: true,
        }).lean();
        return doc ? toRecord(doc) : null;
      } catch (error) {
        return rethrowDuplicate(error);
      }
    },
    async clearRefreshTokenHash(hash) {
      await User.updateOne({ refreshToken: hash }, { $unset: { refreshToken: 1 } });
    },
    async delete(id) {
      if (!isValidObjectId(id)) return false;
      const result = await User.deleteOne({ _id: id });
      if (result.deletedCount > 0) {
        await Holding.deleteMany({ user: id });
      }
      return result.deletedCount > 0;
    },
  },

  holdings: {
    async getForUser(userId) {
      const rows = isValidObjectId(userId) ? await Holding.find({ user: userId }).lean() : [];
      return toHoldingsResponse(rows);
    },
    async setForUser(userId, amounts) {
      await Holding.bulkWrite(
        (Object.entries(amounts) as [Asset, number][]).map(([asset, amount]) => ({
          updateOne: {
            filter: { user: userId, asset },
            update: { $set: { amount } },
            upsert: true,
          },
        }))
      );
    },
  },

  activity: {
    async latest(contractAddress, limit) {
      const rows = await Activity.find({ contractAddress: contractAddress.toLowerCase() })
        .sort({ blockNumber: -1, logIndex: -1 })
        .limit(limit)
        .lean();
      return rows.map((row) => ({
        id: `${row.chainId}:${row.txHash}:${row.logIndex}`,
        event: row.event,
        blockNumber: row.blockNumber,
        txHash: row.txHash,
        timestamp: row.timestamp.toISOString(),
        account: row.account,
        amount: row.amount,
        reference: row.reference,
      }));
    },
  },
});
