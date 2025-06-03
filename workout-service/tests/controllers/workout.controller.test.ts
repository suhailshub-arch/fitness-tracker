import request from "supertest";
import express, { NextFunction, Request, Response, Router } from "express";
import { PrismaClient } from "@prisma/client";
import { errorHandler } from "../../src/middleware/errorHandler.js";
import { exerciseSeedData } from "../../prisma/data/exercises.js";
import workoutSessionRouter from "../../src/routes/workout-sessions.routes.js";
import { execSync } from "child_process";

// Extend Express Request interface for 'user' property
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

app.use((req: Request, _res: Response, next: NextFunction) => {
  req.user = { userId: "test-user" };
  next();
});

app.use("/workouts", workoutSessionRouter);
app.use(errorHandler);

beforeEach(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE "WorkoutExercise" CASCADE;`;
  await prisma.$executeRaw`TRUNCATE TABLE "Workout" CASCADE;`;
  await prisma.$executeRaw`TRUNCATE TABLE "Comment" CASCADE;`;
  await prisma.$executeRaw`TRUNCATE TABLE "Exercise" CASCADE;`;

  await prisma.exercise.createMany({
    data: exerciseSeedData.slice(0, 3), // just seed first 3 for brevity
    skipDuplicates: true,
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  execSync("docker-compose -f docker-compose.test.yml down", {
    stdio: "inherit",
  });
});

describe("POST /workouts (integration)", () => {
  it("creates a new workout with valid exercises", async () => {
    const allExercises = await prisma.exercise.findMany({
      select: { id: true, name: true },
    });
    expect(allExercises.length).toBeGreaterThanOrEqual(2);

    const [exA, exB] = allExercises;

    const payload = {
      scheduledAt: "2025-06-15T09:30:00.000Z",
      exercises: [
        { exerciseId: exA.id, targetReps: 12, targetSets: 3 },
        { exerciseId: exB.id, targetReps: 10, targetSets: 4 },
      ],
    };

    const res = await request(app).post("/workouts").send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("data.workout.id");
    expect(res.body.data.workout.userId).toBeDefined();
    expect(res.body.data.workout.scheduledAt).toEqual(payload.scheduledAt);
  });

  it("returns 400 if scheduledAt is missing or malformed", async () => {
    // Missing scheduledAt
    const res1 = await request(app)
      .post("/workouts")
      .send({
        exercises: [{ exerciseId: "some-id", targetReps: 10, targetSets: 3 }],
      });
    expect(res1.status).toBe(400);
    expect(res1.body).toHaveProperty("error");

    // Malformed scheduledAt (not valid ISO date)
    const res2 = await request(app)
      .post("/workouts")
      .send({
        scheduledAt: "not-a-date",
        exercises: [{ exerciseId: "some-id", targetReps: 10, targetSets: 3 }],
      });
    expect(res2.status).toBe(400);
    expect(res2.body).toHaveProperty("error");
  });

  it("returns 400 if any exerciseId does not exist", async () => {
    // Use an invalid exerciseId (doesn’t exist in DB)
    const payload = {
      scheduledAt: "2025-07-01T10:00:00.000Z",
      exercises: [
        { exerciseId: "nonexistent123", targetReps: 8, targetSets: 2 },
      ],
    };
    const res = await request(app).post("/workouts").send(payload);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/referenced record not found/i);
  });

  it("creates a workout even if `exercises` array is empty", async () => {
    // No exercises means just a Workout row with no nested WorkoutExercise rows
    const payload = { scheduledAt: "2025-08-01T08:00:00.000Z", exercises: [] };
    const res = await request(app).post("/workouts").send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data.workout.id).toBeDefined();
    expect(res.body.data.workout.exercises).toEqual([]); // empty array in the response

    const dbWorkout = await prisma.workout.findUnique({
      where: { id: res.body.data.workout.id },
      include: { exercises: true },
    });
    expect(dbWorkout).not.toBeNull();
    expect(dbWorkout!.exercises.length).toBe(0);
  });
});
