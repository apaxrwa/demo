import mongoose, { Document, Model, Schema } from "mongoose";

/**
 * One indexed APXGold contract event. (chainId, txHash, logIndex) identifies a log
 * uniquely, so re-processing the same blocks never creates duplicates.
 */
export interface IActivity extends Document {
  chainId: number;
  contractAddress: string;
  txHash: string;
  logIndex: number;
  blockNumber: number;
  timestamp: Date;
  event: string;
  account?: string;
  amount?: string;
  reference?: string;
}

const activitySchema: Schema<IActivity> = new mongoose.Schema({
  chainId: { type: Number, required: true },
  contractAddress: { type: String, required: true, lowercase: true },
  txHash: { type: String, required: true, lowercase: true },
  logIndex: { type: Number, required: true },
  blockNumber: { type: Number, required: true },
  timestamp: { type: Date, required: true },
  event: { type: String, required: true },
  account: { type: String, lowercase: true },
  amount: String,
  reference: String,
});

activitySchema.index({ chainId: 1, txHash: 1, logIndex: 1 }, { unique: true });
activitySchema.index({ blockNumber: -1, logIndex: -1 });

const Activity: Model<IActivity> = mongoose.model<IActivity>("Activity", activitySchema);
export default Activity;
