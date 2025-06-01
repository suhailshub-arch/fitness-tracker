import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Unauthorized } from "../utils/ApiError.js";
import { JWT_SECRET } from "../config/index.js";

interface MyJwtPayload extends JwtPayload {
  userId: string;
}

export const authJWTMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers["authorization"];
  if (
    !authHeader ||
    typeof authHeader !== "string" ||
    !authHeader.startsWith("Bearer")
  ) {
    throw Unauthorized("Missing or malformed Authorization header");
  }

  const token = authHeader.split(" ")[1];
  const payload = jwt.verify(token, JWT_SECRET!) as MyJwtPayload;

  req.user = {
    userId: payload.userId,
  };

  next();
};
