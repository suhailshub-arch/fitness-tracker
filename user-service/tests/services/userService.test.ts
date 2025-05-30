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

describe("loginUser", () => {
  const email = "shubJest@testing.com";
  const password = "testingJest";

  it("throws Unauthorized if no user exists wit that email", async () => {
    (prisma.user.findUnique as jest.Mock).mockReturnValue(null);

    await expect(loginUser(email, password)).rejects.toThrow(
      "Email or password is invalid"
    );
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
      },
    });
  });

  it("throws Unauthorized is the password does not match", async () => {
    const foundUser = { id: 3, email, password: "hashed-password" };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(foundUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(loginUser(email, password)).rejects.toThrow(
      "Email or password is invalid"
    );
    expect(bcrypt.compare).toHaveBeenCalledWith(password, foundUser.password);
  });

  it("returns a user and token on successful login", async () => {
    const foundUser = { id: 3, email, password: "hashed-password" };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(foundUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue("jwt-token");

    const result = await loginUser(email, password);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
      },
    });
    expect(bcrypt.compare).toHaveBeenCalledWith(password, foundUser.password);
    expect(jwt.sign).toHaveBeenCalledWith(
      { id: foundUser.id.toString() },
      expect.any(String),
      {
        expiresIn: expect.any(Number),
      }
    );

    expect(result).toEqual({ user: foundUser, token: "jwt-token" });
  });
});
