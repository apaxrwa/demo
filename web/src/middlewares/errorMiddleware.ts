import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import ErrorHandler from "../utils/errorHandler";
import { config } from "../config/env";
import { isDataSourceReady } from "../data";
import { DuplicateKeyError } from "../data/types";

export const requireDatabase = (_req: Request, _res: Response, next: NextFunction) => {
  if (!isDataSourceReady()) {
    return next(new ErrorHandler("Service temporarily unavailable", 503));
  }
  next();
};

export const notFound = (req: Request, _res: Response, next: NextFunction) => {
  next(new ErrorHandler(`Not found: ${req.method} ${req.path}`, 404));
};

const toHttpError = (err: unknown): { status: number; message: string } => {
  if (err instanceof ErrorHandler) {
    return { status: err.statusCode, message: err.message };
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return {
      status: 400,
      message: Object.values(err.errors).map((e) => e.message).join(", "),
    };
  }
  if (err instanceof mongoose.Error.CastError) {
    return { status: 400, message: `Invalid ${err.path}` };
  }
  if (err instanceof DuplicateKeyError || (err as { code?: number })?.code === 11000) {
    return { status: 409, message: "A record with that value already exists" };
  }
  if ((err as { type?: string })?.type === "entity.too.large") {
    return { status: 413, message: "Request body too large" };
  }
  if ((err as { type?: string })?.type === "entity.parse.failed") {
    return { status: 400, message: "Malformed JSON body" };
  }
  return { status: 500, message: "Internal server error" };
};

export const errorMiddleware = (
  err: unknown,
  _req: Request,
  res: Response,
  // Express only treats 4-argument middleware as an error handler.
  _next: NextFunction
) => {
  const { status, message } = toHttpError(err);

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    success: false,
    message: status >= 500 && config.isProduction ? "Internal server error" : message,
  });
};
