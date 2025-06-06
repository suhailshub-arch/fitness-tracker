/**
 * tests/controllers/workout.controller.postComment.integration.test.ts
 */

import request from "supertest";
import express, { NextFunction, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { errorHandler } from "../../src/middleware/errorHandler.js";
import { exerciseSeedData } from "../../prisma/data/exercises.js";
import commentRouter from "../../src/routes/comments.router.js";

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string };
    }
  }
}

const prisma = new PrismaClient();
const app = express();

app.use(express.json());

// Fake auth middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.user = { userId: "test-user" };
  next();
});

// Mount the comments router under /workouts/:workoutId/comments
app.use("/workouts/:workoutId/comments", commentRouter);
app.use(errorHandler);

beforeEach(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE "WorkoutExercise" CASCADE;`;
  await prisma.$executeRaw`TRUNCATE TABLE "Workout" CASCADE;`;
  await prisma.$executeRaw`TRUNCATE TABLE "Comment" CASCADE;`;
  await prisma.$executeRaw`TRUNCATE TABLE "Exercise" CASCADE;`;

  // Seed some exercises
  await prisma.exercise.createMany({
    data: exerciseSeedData.slice(0, 3),
    skipDuplicates: true,
  });

  // Create a workout for test-user
  await prisma.workout.create({
    data: {
      userId: "test-user",
      scheduledAt: new Date("2025-06-01T08:00:00.000Z"),
      status: "PENDING",
    },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /workouts/:workoutId/comments (integration)", () => {
  it("creates a comment and returns 201 with correct JSON", async () => {
    // 1) Find the seeded workout’s ID
    const workout = await prisma.workout.findFirst({
      where: { userId: "test-user" },
    });
    expect(workout).not.toBeNull();
    const workoutId = workout!.id;

    // 2) Send a valid POST
    const commentText = "Loved this session!";
    const res = await request(app)
      .post(`/workouts/${workoutId}/comments`)
      .send({ text: commentText });
    // 3) Expect 201 and JSON response
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      success: true,
      data: {
        posted: {
          userId: "test-user",
          text: commentText,
          createdAt: expect.any(String),
        },
      },
    });

    // 4) Confirm the comment exists in the database
    const dbComment = await prisma.comment.findFirst({
      where: { workoutId, userId: "test-user" },
    });
    expect(dbComment).not.toBeNull();
    expect(dbComment!.text).toBe(commentText);
    expect(dbComment!.userId).toBe("test-user");
    expect(new Date(dbComment!.createdAt)).toBeInstanceOf(Date);
  });

  it("returns 400 if `text` is missing or not a string", async () => {
    // 1) Find the workout’s ID
    const workout = await prisma.workout.findFirst({
      where: { userId: "test-user" },
    });
    expect(workout).not.toBeNull();
    const workoutId = workout!.id;

    // 2a) POST without text field
    const res1 = await request(app)
      .post(`/workouts/${workoutId}/comments`)
      .send({});
    expect(res1.status).toBe(400);
    expect(res1.body).toHaveProperty("error");

    // 2b) POST with non‐string text
    const res2 = await request(app)
      .post(`/workouts/${workoutId}/comments`)
      .send({ text: 123 });
    expect(res2.status).toBe(400);
    expect(res2.body).toHaveProperty("error");

    // 3) Confirm no comment was written
    const allComments = await prisma.comment.findMany({ where: { workoutId } });
    expect(allComments.length).toBe(0);
  });

  it("returns 404 if the workoutId does not exist", async () => {
    // Use a made‐up workoutId
    const fakeWorkoutId = "nonexistent123";

    const res = await request(app)
      .post(`/workouts/${fakeWorkoutId}/comments`)
      .send({ text: "Hello" });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");

    // Confirm no comment written to any real workout
    const count = await prisma.comment.count();
    expect(count).toBe(0);
  });
});
