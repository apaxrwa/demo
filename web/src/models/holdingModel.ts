import mongoose, { Model, Schema, Types } from "mongoose";
import { ASSETS, Asset } from "../data/types";

/**
 * One row per user per asset. Metals are stored in grams; APX-i in tokens.
 */
export interface HoldingDocument {
  user: Types.ObjectId;
  asset: Asset;
  amount: number;
  updatedAt: Date;
}

const holdingSchema = new Schema<HoldingDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    asset: { type: String, enum: ASSETS, required: true },
    amount: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

holdingSchema.index({ user: 1, asset: 1 }, { unique: true });

const Holding: Model<HoldingDocument> = mongoose.model<HoldingDocument>("Holding", holdingSchema);
export default Holding;
