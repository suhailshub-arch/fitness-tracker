import request from "supertest";
import express from "express";
import authRouter from "../../src/routes/auth";
import jwt from "jsonwebtoken";
import { errorHandler } from "../../src/middleware/errorHandler";
import { PrismaClient } from "@prisma/client";

const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);
app.use(errorHandler);

const prisma = new PrismaClient();

beforeEach(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE "User" CASCADE`;
});

afterAll(async () => {
  prisma.$disconnect();
});

const validUser = {
  email: "shubJest@test.com",
  password: "test-password",
  name: "Shub Test Jest",
};

describe("POST /api/auth/register", () => {
  it("presists a new user", async () => {
    const res = await request(app).post("/api/auth/register").send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(validUser.email);

    const user = await prisma.user.findUnique({
      where: { email: validUser.email },
    });
    expect(user).not.toBeNull();
    expect(user!.name).toBe(validUser.name);
  });

  it("rejects duplicate registration", async () => {
    await request(app).post("/api/auth/register/").send(validUser);

    const res2 = await request(app).post("/api/auth/register").send(validUser);
    expect(res2.status).toBe(409);
    expect(res2.body.error).toMatch(/already in use/i);
  });

  describe("Registration with missing fields", () => {
    it("rejects registration with missing password", async () => {
      const res = await request(app).post("/api/auth/register").send({
        email: "shubJest@test.com",
      });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("rejects registration with missing email", async () => {
      const res = await request(app).post("/api/auth/register").send({
        password: "password",
      });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("Registration with invalid fields", () => {
    it("rejects invalid email", async () => {
      const res = await request(app).post("/api/auth/register").send({
        email: 1,
      });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("rejects password that is too short", async () => {
      const res = await request(app).post("/api/auth/register").send({
        password: "1",
      });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
  });
});

describe("POST /api/auth/login", () => {
  it("allows login after successful registration", async () => {
    await request(app).post("/api/auth/register").send(validUser).expect(201);

    const resLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: validUser.password });

    expect(resLogin.status).toBe(200);
    expect(resLogin.body.data.user.name).toBe(validUser.name);
    expect(resLogin.body).toHaveProperty("data.token");

    const payload = jwt.verify(
      resLogin.body.data.token,
      process.env.JWT_SECRET!
    );
    expect(payload).toHaveProperty("id");
  });

  it("rejects login with wrong password", async () => {
    await request(app).post("/api/auth/register").send(validUser).expect(201);
    const bad = await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: "wrongpassword" });
    expect(bad.status).toBe(401);
    expect(bad.body.error).toBe("Email or password is invalid");
  });

  it("rejects login for a non existant user", async () => {
    await request(app).post("/api/auth/register").send(validUser).expect(201);
    const bad = await request(app)
      .post("/api/auth/login")
      .send({ email: "wromg@email.com", password: "wrongpassword" });
    expect(bad.status).toBe(401);
    expect(bad.body.error).toBe("Email or password is invalid");
  });
});
