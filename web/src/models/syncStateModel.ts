import mongoose, { Document, Model, Schema } from "mongoose";

/**
 * Indexer cursor: the last block whose events were fully stored, per chain and contract.
 */
export interface ISyncState extends Document {
  key: string;
  lastBlock: number;
  // Lets the indexer notice when that block was replaced (chain reset or reorg).
  lastBlockHash?: string;
}

const syncStateSchema: Schema<ISyncState> = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    lastBlock: { type: Number, required: true },
    lastBlockHash: String,
  },
  { timestamps: true }
);

const SyncState: Model<ISyncState> = mongoose.model<ISyncState>("SyncState", syncStateSchema);
export default SyncState;
