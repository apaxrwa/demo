import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import ErrorHandler from "../../utils/errorHandler";
import asyncErrorHandler from "../helpers/asyncErrorHandler";
import { config } from "../../config/env";
import { getStores } from "../../data";
import type { UserRecord } from "../../data/types";

export interface AuthenticatedRequest extends Request {
  user?: UserRecord;
}

interface DecodedToken extends JwtPayload {
  id: string;
}

const readToken = (req: Request): string | undefined => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim() || undefined;
  }
  return req.cookies?.token;
};

// Check if user is authenticated
export const isAuthenticatedUser = asyncErrorHandler<AuthenticatedRequest>(
  async (req, _res, next) => {
    const token = readToken(req);

    if (!token) {
      return next(new ErrorHandler("Please Login to Access", 401));
    }

    let decodedData: DecodedToken;
    try {
      decodedData = jwt.verify(token, config.jwtSecret) as DecodedToken;
    } catch (error) {
      const expired = error instanceof jwt.TokenExpiredError;
      return next(
        new ErrorHandler(expired ? "Session expired" : "Invalid token", 401)
      );
    }

    const user = await getStores().users.findById(decodedData.id);

    if (!user) {
      return next(new ErrorHandler("Please Login to Access", 401));
    }

    req.user = user;
    next();
  }
);

// Role-based authorization
export const authorizeRoles =
  (...roles: string[]) =>
  (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ErrorHandler("You are not allowed to do this", 403));
    }

    next();
  };
