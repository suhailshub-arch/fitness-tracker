import request from "supertest";
import { PrismaClient } from "@prisma/client";
import express, { NextFunction, Request, Response } from "express";
import exerciseRouter from "../../src/routes/exercises.router.js";
import { errorHandler } from "../../src/middleware/errorHandler.js";
import { exerciseSeedData } from "../../prisma/data/exercises.js";

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

// Fake auth: always “test-user”
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.user = { userId: "test-user" };
  next();
});

// Mount router under /workouts/:workoutId/exercises
app.use("/workouts/:workoutId/exercises", exerciseRouter);
app.use(errorHandler);

beforeEach(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE "WorkoutExercise" CASCADE;`;
  await prisma.$executeRaw`TRUNCATE TABLE "Workout" CASCADE;`;
  await prisma.$executeRaw`TRUNCATE TABLE "Comment" CASCADE;`;
  await prisma.$executeRaw`TRUNCATE TABLE "Exercise" CASCADE;`;
  // Seed exercises
  await prisma.exercise.createMany({
    data: exerciseSeedData.slice(0, 3),
    skipDuplicates: true,
  });

  // Create a workout with two nested exercises for test-user
  const exList = await prisma.exercise.findMany({ select: { id: true } });
  const [ex1, ex2] = exList.map((e) => e.id);

  await prisma.workout.create({
    data: {
      userId: "test-user",
      scheduledAt: new Date("2025-06-01T08:00:00.000Z"),
      status: "COMPLETED",
      exercises: {
        create: [
          {
            exercise: { connect: { id: ex1 } },
            sequence: 1,
            targetReps: 10,
            targetSets: 3,
          },
          {
            exercise: { connect: { id: ex2 } },
            sequence: 2,
            targetReps: 8,
            targetSets: 4,
          },
        ],
      },
    },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("PATCH /workouts/:workoutId/exercises/:exerciseEntryId", () => {
  it("marks an exercise as done and sets actualReps/actualSets", async () => {
    // 1) Find the workout we just created
    const workout = await prisma.workout.findFirst({
      where: { userId: "test-user" },
      include: { exercises: true },
    });
    expect(workout).not.toBeNull();
    const workoutId = workout!.id;

    // 2) Grab one of the WorkoutExercise entries
    const entry = workout!.exercises[0];
    const exerciseEntryId = entry.id;

    // 3) Send PATCH with { done: true, actualReps: 12, actualSets: 3 }
    const patchBody = { completed: true, actualReps: 12, actualSets: 3 };
    const res = await request(app)
      .patch(`/workouts/${workoutId}/exercises/${exerciseEntryId}`)
      .send(patchBody);
    console.log(res);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("data.workoutExercise");

    const updated = res.body.data.workoutExercise;
    expect(updated.id).toBe(exerciseEntryId);
    expect(updated.completed).toBe(true);
    expect(updated.actualReps).toBe(12);
    expect(updated.actualSets).toBe(3);

    // 4) Confirm in database
    const dbEntry = await prisma.workoutExercise.findUnique({
      where: { id: exerciseEntryId },
    });
    expect(dbEntry).not.toBeNull();
    expect(dbEntry!.completed).toBe(true);
    expect(dbEntry!.actualReps).toBe(12);
    expect(dbEntry!.actualSets).toBe(3);
  });

  it("marks an exercise as undone when done=false and leaves actualReps/actualSets unchanged", async () => {
    // 1) Find the workout
    const workout = await prisma.workout.findFirst({
      where: { userId: "test-user" },
      include: { exercises: true },
    });
    expect(workout).not.toBeNull();
    const workoutId = workout!.id;

    // 2) Use second entry, but first set it to done in DB
    const entry = workout!.exercises[1];
    const exerciseEntryId = entry.id;
    await prisma.workoutExercise.update({
      where: { id: exerciseEntryId },
      data: { completed: true, actualReps: 15, actualSets: 5 },
    });

    // 3) Now PATCH with done=false (omit actualReps/actualSets)
    const patchBody = { completed: false };
    const res = await request(app)
      .patch(`/workouts/${workoutId}/exercises/${exerciseEntryId}`)
      .send(patchBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const updated = res.body.data.workoutExercise;
    expect(updated.id).toBe(exerciseEntryId);
    expect(updated.completed).toBe(false);
    // actualReps/actualSets remain as before
    expect(updated.actualReps).toBe(15);
    expect(updated.actualSets).toBe(5);

    // 4) Confirm in database
    const dbEntry = await prisma.workoutExercise.findUnique({
      where: { id: exerciseEntryId },
    });
    expect(dbEntry).not.toBeNull();
    expect(dbEntry!.completed).toBe(false);
    expect(dbEntry!.actualReps).toBe(15);
    expect(dbEntry!.actualSets).toBe(5);
  });

  it("returns 404 if the exerciseEntryId does not exist under that workout/user", async () => {
    // 1) Find the workout
    const workout = await prisma.workout.findFirst({
      where: { userId: "test-user" },
    });
    expect(workout).not.toBeNull();
    const workoutId = workout!.id;

    // 2) Use a random UUID for exerciseEntryId
    const fakeEntryId = "nonexistent‐entry‐id";

    const patchBody = { completed: true };
    const res = await request(app)
      .patch(`/workouts/${workoutId}/exercises/${fakeEntryId}`)
      .send(patchBody);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Exercise entry not found" });
  });

  it("returns 400 if `done` is missing or invalid", async () => {
    // 1) Find the workout
    const workout = await prisma.workout.findFirst({
      where: { userId: "test-user" },
      include: { exercises: true },
    });
    expect(workout).not.toBeNull();
    const workoutId = workout!.id;
    const entryId = workout!.exercises[0].id;

    // 2a) PATCH without `done`
    const res1 = await request(app)
      .patch(`/workouts/${workoutId}/exercises/${entryId}`)
      .send({ actualReps: 5 });
    expect(res1.status).toBe(400);
    expect(res1.body).toHaveProperty("error");

    // 2b) PATCH with invalid done type
    const res2 = await request(app)
      .patch(`/workouts/${workoutId}/exercises/${entryId}`)
      // @ts-ignore: intentionally sending wrong type
      .send({ completed: "yes", actualReps: 5 });
    expect(res2.status).toBe(400);
    expect(res2.body).toHaveProperty("error");
  });
});
