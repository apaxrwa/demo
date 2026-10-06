import { config, isChainConfigured } from "./config/env";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cloudinary from "cloudinary";

import { closeDataSource, getStores, initDataSource, isDataSourceReady } from "./data";
import { demoLoginHint } from "./data/demoData";
import { errorMiddleware, notFound, requireDatabase } from "./middlewares/errorMiddleware";
import userRoutes from "./routes/users";
import holdingRoutes from "./routes/holdings";
import activityRoutes from "./routes/activity";
import reconciliationRoutes from "./routes/reconciliation";
import { startIndexer } from "./indexer/apxGoldIndexer";

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Requests without an Origin header (curl, server-to-server) are allowed.
      if (!origin || config.frontendOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try again later" },
});

app.get("/health", (_req, res) => {
  const source = getStores().source;
  res.json({
    success: true,
    dataSource: source,
    database: source === "mock" ? "not used" : isDataSourceReady() ? "connected" : "disconnected",
    indexer: source === "mongodb" && isChainConfigured() ? "enabled" : "disabled",
  });
});

app.use(
  ["/user/login", "/user/register", "/user/password/forgot", "/user/password/reset"],
  authLimiter
);
app.use("/user", requireDatabase, userRoutes);
app.use("/api/holdings", requireDatabase, holdingRoutes);
app.use("/api/activity", requireDatabase, activityRoutes);
app.use("/api/reconciliation", requireDatabase, reconciliationRoutes);

app.use(notFound);
app.use(errorMiddleware);

const start = async () => {
  if (process.env.CLOUDINARY_NAME) {
    cloudinary.v2.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  const { source } = await initDataSource();

  if (source === "mock") {
    console.log(`Demo login: ${demoLoginHint()}`);
  }

  app.listen(config.port, () => {
    console.log(`Server listening on port ${config.port}`);
  });

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      void closeDataSource().finally(() => process.exit(0));
    });
  }

  // The indexer stores events in MongoDB, so it only runs with a real database.
  if (source === "mongodb" && isChainConfigured()) {
    startIndexer();
  } else if (isChainConfigured()) {
    console.log("Indexer disabled: it needs MongoDB to store events");
  } else {
    console.log("Indexer disabled: set RPC_URL and APX_GOLD_ADDRESS to enable it");
  }
};

start().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
