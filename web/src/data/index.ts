import mongoose from "mongoose";
import { config } from "../config/env";
import connectDatabase, { disconnectDatabase, isDatabaseReady } from "../config/database";
import { createMemoryStores } from "./memoryStore";
import { createMongoStores } from "./mongoStore";
import type { DataStores } from "./types";

let stores: DataStores | null = null;

/** The active data source. Call initDataSource() before handling requests. */
export const getStores = (): DataStores => {
  if (!stores) {
    throw new Error("Data source not initialised");
  }
  return stores;
};

/**
 * Uses MongoDB when MONGO_URI is set and reachable. Otherwise falls back to in-memory
 * mock data, except in production, where a missing database stops the server.
 */
export const initDataSource = async (): Promise<DataStores> => {
  if (config.mongoUri) {
    try {
      await connectDatabase(config.mongoUri);
      console.log("Data source: MongoDB");
      stores = createMongoStores();
      return stores;
    } catch (error) {
      if (config.isProduction) {
        throw error;
      }
      await mongoose.disconnect().catch(() => undefined);
      console.warn(`MongoDB is not reachable (${(error as Error).message}); using mock data instead.`);
    }
  } else {
    console.log("MONGO_URI is not set; using mock data.");
  }

  console.log("Mock data is kept in memory and resets when the server restarts.");
  stores = createMemoryStores();
  return stores;
};

export const isDataSourceReady = (): boolean =>
  stores?.source === "mock" || (stores?.source === "mongodb" && isDatabaseReady());

export const closeDataSource = async (): Promise<void> => {
  if (stores?.source === "mongodb") {
    await disconnectDatabase();
  }
};
