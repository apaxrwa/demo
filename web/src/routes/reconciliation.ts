import { Router } from "express";
import asyncErrorHandler from "../middlewares/helpers/asyncErrorHandler";
import {
  AuthenticatedRequest,
  isAuthenticatedUser,
} from "../middlewares/user_actions/auth";
import { isChainConfigured } from "../config/env";
import { getStores } from "../data";
import { getOnChainGoldGrams } from "../services/chain";
import { ReconciliationResponse } from "../types/api";

const router = Router();

// Allow for float rounding of gram amounts stored in MongoDB.
const TOLERANCE_GRAMS = 1e-6;

// Compares the user's recorded gold grams with the APXG balance of their linked wallet.
// Mismatches are reported for review; nothing is corrected automatically.
router.get(
  "/",
  isAuthenticatedUser,
  asyncErrorHandler<AuthenticatedRequest>(async (req, res) => {
    const user = req.user!;
    const { goldGrams } = await getStores().holdings.getForUser(user.id);
    const base = { offChainGrams: goldGrams, checkedAt: new Date().toISOString() };

    let data: ReconciliationResponse;

    if (!isChainConfigured()) {
      data = { ...base, status: "not_configured" };
    } else if (!user.walletAddress) {
      data = { ...base, status: "no_wallet" };
    } else {
      try {
        const onChainGrams = await getOnChainGoldGrams(user.walletAddress);
        data = {
          ...base,
          walletAddress: user.walletAddress,
          onChainGrams,
          status: Math.abs(onChainGrams - goldGrams) <= TOLERANCE_GRAMS ? "match" : "mismatch",
        };
      } catch (error) {
        console.error("Reconciliation chain read failed:", (error as Error).message);
        data = { ...base, walletAddress: user.walletAddress, status: "unavailable" };
      }
    }

    res.json({ success: true, data });
  })
);

export default router;
