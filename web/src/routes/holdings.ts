import { Router } from "express";
import asyncErrorHandler from "../middlewares/helpers/asyncErrorHandler";
import {
  AuthenticatedRequest,
  isAuthenticatedUser,
} from "../middlewares/user_actions/auth";
import { getStores } from "../data";

const router = Router();

router.get(
  "/",
  isAuthenticatedUser,
  asyncErrorHandler<AuthenticatedRequest>(async (req, res) => {
    const holdings = await getStores().holdings.getForUser(req.user!.id);
    res.json({ success: true, data: holdings });
  })
);

export default router;
