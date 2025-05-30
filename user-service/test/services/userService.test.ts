import { registerUser, loginUser } from "../../src/services/userService";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

jest.mock("@prisma/client", () => {
  const mockedPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mockedPrisma) };
});

jest.mock("bcrypt");
jest.mock("jsonwebtoken");

const prisma = new PrismaClient() as jest.Mocked<PrismaClient>;

describe("registerUser", () => {
  const email = "shubJest@testing.com";
  const password = "testingJest";
  const name = "Shub Testing Jest";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws Conflict if email already in use", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      email,
      name,
      createdAt: new Date(),
    } as any);

    await expect(registerUser(email, password, name)).rejects.toThrow(
      "Email already in use"
    );

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email } });
  });

  it("creates a new user and returns user + token", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");

    const fakeUser = {
      id: 123,
      email,
      name,
      createdAt: new Date(),
    };
    (prisma.user.create as jest.Mock).mockResolvedValue(fakeUser);

    (jwt.sign as jest.Mock).mockReturnValue("jwt-token");

    const result = await registerUser(email, password, name);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email } });
    expect(bcrypt.hash).toHaveBeenCalledWith(password, expect.any(Number));
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email, password: "hashed-password", name },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
    expect(jwt.sign).toHaveBeenCalledWith(
      { id: fakeUser.id.toString() },
      expect.any(String),
      { expiresIn: expect.any(Number) }
    );

    expect(result).toEqual({
      user: fakeUser,
      token: "jwt-token",
    });
  });
});
