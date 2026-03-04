import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";
import { sendError } from "../utils/response";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  logger.error(`Unhandled error: ${err.message}`, err);
  sendError(res, "An unexpected error occurred", 500, err.message);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, `Route ${req.method} ${req.path} not found`, 404);
};
