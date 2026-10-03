import mongoose from "mongoose";

const DEFAULT_DB_NAME = "apax";
const CONNECT_TIMEOUT_MS = 5_000;

// A connection string like mongodb+srv://user:pass@cluster.mongodb.net has no database
// path, which would make MongoDB use "test". Fall back to "apax" in that case only.
const hasDatabaseName = (uri: string): boolean => {
  try {
    return new URL(uri).pathname.replace(/^\//, "") !== "";
  } catch {
    return true;
  }
};

/** Connects to MongoDB, failing after a few seconds if the server cannot be reached. */
const connectDatabase = async (uri: string): Promise<void> => {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: CONNECT_TIMEOUT_MS,
    ...(hasDatabaseName(uri) ? {} : { dbName: DEFAULT_DB_NAME }),
  });
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
};

export const isDatabaseReady = (): boolean => mongoose.connection.readyState === 1;

export default connectDatabase;
