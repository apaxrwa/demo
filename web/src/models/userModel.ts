import mongoose, { Model, Schema, Types } from "mongoose";
import validator from "validator";
import { USER_ROLES, UserRole } from "../data/types";

/**
 * MongoDB document shape. Hashing and token logic live in services/auth.ts so the
 * mock data store behaves identically; this file only describes storage.
 */
export interface UserDocument {
  _id: Types.ObjectId;
  name: string;
  email: string;
  gender: string;
  password: string; // bcrypt hash
  avatar?: { public_id?: string; url?: string };
  role: UserRole;
  walletAddress?: string;
  createdAt: Date;
  resetPasswordToken?: string; // sha256 hash
  resetPasswordExpire?: Date;
  refreshToken?: string; // sha256 hash
}

const userSchema = new Schema<UserDocument>({
  name: {
    type: String,
    required: [true, "Please Enter Your Name"],
  },
  email: {
    type: String,
    required: [true, "Please Enter Your Email"],
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, "Please Enter a valid Email"],
  },
  gender: {
    type: String,
    required: [true, "Please Enter Gender"],
  },
  password: {
    type: String,
    required: [true, "Please Enter Your Password"],
  },
  avatar: {
    public_id: String,
    url: String,
  },
  role: {
    type: String,
    enum: USER_ROLES,
    default: "user",
  },
  walletAddress: {
    type: String,
    lowercase: true,
    trim: true,
    validate: {
      validator: (value: string) => /^0x[0-9a-f]{40}$/.test(value),
      message: "Wallet address must be a 0x-prefixed 20-byte hex address",
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  refreshToken: String,
});

const User: Model<UserDocument> = mongoose.model<UserDocument>("User", userSchema);
export default User;
