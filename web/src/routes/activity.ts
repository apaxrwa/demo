import { Router } from "express";
import asyncErrorHandler from "../middlewares/helpers/asyncErrorHandler";
import { isAuthenticatedUser } from "../middlewares/user_actions/auth";
import { getStores } from "../data";
import { config } from "../config/env";

const router = Router();

// Latest indexed APXGold events (the proof-of-reserve audit trail).
router.get(
  "/",
  isAuthenticatedUser,
  asyncErrorHandler(async (req, res) => {
    const requested = Number(req.query.limit ?? 50);
    const limit = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), 200) : 50;

    const contract = config.chain.apxGoldAddress;
    const data = contract ? await getStores().activity.latest(contract, limit) : [];
    res.json({ success: true, data });
  })
);

export default router;
