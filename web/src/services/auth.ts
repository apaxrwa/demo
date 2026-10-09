import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import type { UserRecord } from "../data/types";
import type { SafeUser } from "../types/api";

export const MIN_PASSWORD_LENGTH = 8;

export const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const hashPassword = (password: string) => bcrypt.hash(password, 10);

// Compared against when the email is unknown, so both paths take the same time.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), 10);

export const verifyPassword = (password: string, user: UserRecord | null) =>
  bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

export const signAccessToken = (user: UserRecord): string =>
  jwt.sign({ id: user.id }, config.jwtSecret, {
    expiresIn: (process.env.JWT_EXPIRE ?? "15m") as jwt.SignOptions["expiresIn"],
  });

/** Returns a new refresh token and the hash to store, so it can be revoked later. */
export const createRefreshToken = (user: UserRecord): { token: string; hash: string } => {
  const token = jwt.sign({ id: user.id }, config.jwtRefreshSecret, {
    expiresIn: `${config.cookieExpireDays}d`,
    jwtid: crypto.randomUUID(),
  });
  return { token, hash: hashToken(token) };
};

/** Returns the user id from a valid refresh token, or null. */
export const readRefreshToken = (token: string): string | null => {
  try {
    const payload = jwt.verify(token, config.jwtRefreshSecret) as jwt.JwtPayload;
    return typeof payload.id === "string" ? payload.id : null;
  } catch {
    return null;
  }
};

export const createResetToken = () => {
  const token = crypto.randomBytes(20).toString("hex");
  return { token, hash: hashToken(token), expires: new Date(Date.now() + 15 * 60 * 1000) };
};

export const toSafeUser = (user: UserRecord): SafeUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatarUrl: user.avatar?.url,
  walletAddress: user.walletAddress,
});
