import crypto from "crypto";
import path from "path";
import dotenv from "dotenv";

// dotenv never overwrites a variable that is already set, so the first file wins:
// real environment variables, then an optional local web/.env, then the committed
// development settings in src/config/.config.env.
dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), "src/config/.config.env"), quiet: true });

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";

const readSecret = (name: string): string => {
  const value = process.env[name];
  if (value) {
    if (value.length < 32) {
      throw new Error(`${name} must be at least 32 characters long`);
    }
    return value;
  }
  if (isProduction) {
    throw new Error(`${name} must be set in production`);
  }
  console.warn(`${name} is not set; using a temporary secret, so logins reset on restart.`);
  return crypto.randomBytes(48).toString("hex");
};

const optional = (name: string): string | undefined => {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
};

const mongoUri = optional("MONGO_URI") ?? optional("MONGODB_URI");
if (!mongoUri && isProduction) {
  throw new Error("MONGO_URI (or MONGODB_URI) must be set in production");
}

export const config = {
  nodeEnv,
  isProduction,
  // Not PORT: Next.js also reads PORT, and the two servers must not share a port.
  port: Number(process.env.API_PORT ?? 4000),
  // Undefined (or unreachable) in development means "use in-memory mock data".
  mongoUri,
  jwtSecret: readSecret("JWT_SECRET"),
  jwtRefreshSecret: readSecret("JWT_REFRESH_SECRET"),
  cookieExpireDays: Number(process.env.COOKIE_EXPIRE ?? 7),
  frontendOrigins: (process.env.FRONTEND_URL ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean),
  chain: {
    rpcUrl: optional("RPC_URL"),
    apxGoldAddress: optional("APX_GOLD_ADDRESS"),
    startBlock: Number(process.env.INDEXER_START_BLOCK ?? 0),
    confirmations: Number(process.env.INDEXER_CONFIRMATIONS ?? 2),
    pollMs: Number(process.env.INDEXER_POLL_MS ?? 10_000),
  },
};

export const isChainConfigured = (): boolean =>
  Boolean(config.chain.rpcUrl && config.chain.apxGoldAddress);
