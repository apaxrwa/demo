import { CookieOptions, Response } from "express";
import { config } from "../config/env";
import { getStores } from "../data";
import type { UserRecord } from "../data/types";
import { createRefreshToken, signAccessToken, toSafeUser } from "../services/auth";

export const authCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  sameSite: "lax",
  secure: config.isProduction,
  path: "/",
});

const sendToken = async (user: UserRecord, statusCode: number, res: Response) => {
  const token = signAccessToken(user);
  const refresh = createRefreshToken(user);

  await getStores().users.update(user.id, { refreshTokenHash: refresh.hash });

  const options: CookieOptions = {
    ...authCookieOptions(),
    maxAge: config.cookieExpireDays * 24 * 60 * 60 * 1000,
  };

  res
    .status(statusCode)
    .cookie("token", token, options)
    .cookie("refreshToken", refresh.token, options)
    .json({
      success: true,
      user: toSafeUser(user),
    });
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie("token", authCookieOptions());
  res.clearCookie("refreshToken", authCookieOptions());
};

export default sendToken;
