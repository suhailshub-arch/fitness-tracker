import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

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
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      res.status(404).json({
        error: "Referenced record not found.",
      });
    }
    res.status(500).json({
      error: "Database Error",
    });
  }
  res.status(500).json({
    error: "Internal Server Error",
  });
};
