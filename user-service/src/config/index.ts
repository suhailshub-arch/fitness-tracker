import path from "node:path";
import dotenv from "dotenv";

// default to “development” if NODE_ENV isn’t set
const env = process.env.NODE_ENV?.trim() || "development";
console.log(env);
// resolve the appropriate file, e.g. “.env.development”
dotenv.config({
  path: path.resolve(process.cwd(), `.env.${env}`),
});

export const PORT = process.env.PORT || 3001;
export const DATABASE_URL = process.env.DATABASE_URL || "";
export const JWT_SECRET = process.env.JWT_SECRET || "lmao";
export const JWT_EXPIRES_IN = Number(process.env.JWT_EXPIRES_IN) || 1;
export const BCRYPT_SALT_ROUND = Number(process.env.BCRYPT_SALT_ROUND) || 10;

console.log("DATABASE_URL", DATABASE_URL);
console.log("PORT", PORT);
console.log("JWT_SECRET", JWT_SECRET);
console.log("JWT_EXPIRES_IN", JWT_EXPIRES_IN);
console.log("BCRYPT_SALT_ROUND", BCRYPT_SALT_ROUND);
