import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ApiError) {
    const { statusCode, message, details } = err;
    res.status(statusCode).json({
      error: message,
      ...(details && { details }),
    });
    return;
  }

  res.status(500).json({
    error: "Internal Server Error",
  });
};
