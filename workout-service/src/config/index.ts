import dotenv from "dotenv";
import path from "node:path";

const env = process.env.NODE_ENV?.trim() || "";
const pathEnv = path.resolve(
  process.cwd(),
  env === "" ? ".env" : `.env.${env}`
);
dotenv.config({
  path: pathEnv,
});

export const PORT = process.env.PORT || 3002;
export const DATABASE_URL = process.env.DATABASE_URL || "";
export const JWT_SECRET = process.env.JWT_SECRET;

console.log(path.resolve(process.cwd(), env === "" ? ".env" : `.env.${env}`));
