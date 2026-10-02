import { config } from "../src/config/env";
import connectDatabase, { disconnectDatabase } from "../src/config/database";
import { createMongoStores } from "../src/data/mongoStore";
import {
  DEMO_EMAIL,
  DEMO_HOLDINGS,
  DEMO_NAME,
  DEMO_PASSWORD,
  DEMO_WALLET,
} from "../src/data/demoData";
import { hashPassword } from "../src/services/auth";

// Creates or resets the demo user and holdings in the MongoDB from MONGO_URI.
// Mock data mode needs no seeding: it always starts with the demo user.
const seed = async () => {
  if (!config.mongoUri) {
    console.log("MONGO_URI is not set: the API uses mock data, which already includes the demo user.");
    return;
  }

  await connectDatabase(config.mongoUri);
  const { users, holdings } = createMongoStores();

  const fields = {
    name: DEMO_NAME,
    gender: "other",
    passwordHash: await hashPassword(DEMO_PASSWORD),
    walletAddress: DEMO_WALLET,
  };
  const existing = await users.findByEmail(DEMO_EMAIL);
  const user = existing
    ? await users.update(existing.id, fields)
    : await users.create({ ...fields, email: DEMO_EMAIL });

  await holdings.setForUser(user!.id, DEMO_HOLDINGS);
  console.log(`Demo user ready: ${DEMO_EMAIL}`);
};

seed()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
