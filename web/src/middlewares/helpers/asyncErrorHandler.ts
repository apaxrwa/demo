import { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncHandler<R extends Request = Request> = (
  req: R,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

const asyncErrorHandler =
  <R extends Request = Request>(fn: AsyncHandler<R>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req as R, res, next)).catch(next);
  };

export default asyncErrorHandler;
