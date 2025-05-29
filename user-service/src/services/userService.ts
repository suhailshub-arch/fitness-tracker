import { PrismaClient } from "@prisma/client";
import { Conflict } from "../utils/ApiError.js";
import { hash } from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/index.js";

const prisma = new PrismaClient();

export async function registerUser(
  email: string,
  password: string,
  name: string
) {
  // (2) uniqueness check, (3) hash, (4) create, (5) sign JWT
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw Conflict("Email already in use");

  const hashedPassword = await hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });

  const payload = { id: user.id.toString() };
  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return { user, token };
}

export async function loginUser(email: string, password: string) {
  // (1) lookup user, (2) compare hash, (3) sign JWT
}
