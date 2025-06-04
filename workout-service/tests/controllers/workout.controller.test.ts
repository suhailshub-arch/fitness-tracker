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

  const exList = await prisma.exercise.findMany({ select: { id: true } });
  const [ex1, ex2, ex3] = exList.map((e) => e.id);

  // 1) A completed workout on 2025-06-01 with two exercises
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

  // 2) A PENDING workout on 2025-06-05 with one exercise
  await prisma.workout.create({
    data: {
      userId: "test-user",
      scheduledAt: new Date("2025-06-05T12:30:00.000Z"),
      status: "PENDING",
      exercises: {
        create: [
          {
            exercise: { connect: { id: ex3 } },
            sequence: 1,
            targetReps: 12,
            targetSets: 2,
          },
        ],
      },
    },
  });

  // 3) A CANCELLED workout on 2025-06-10 with no exercises array (create only the Workout row)
  await prisma.workout.create({
    data: {
      userId: "test-user",
      scheduledAt: new Date("2025-06-10T18:00:00.000Z"),
      status: "CANCELLED",
      exercises: { create: [] },
    },
  });

  // 4) A PENDING workout on 2025-07-01 for a different user (“other-user”) – this should be filtered out
  await prisma.workout.create({
    data: {
      userId: "other-user",
      scheduledAt: new Date("2025-07-01T09:00:00.000Z"),
      status: "PENDING",
      exercises: { create: [] },
    },
  });

  // 5) A completed workout on 2025-06-20 for “test-user”
  await prisma.workout.create({
    data: {
      userId: "test-user",
      scheduledAt: new Date("2025-06-20T07:15:00.000Z"),
      status: "COMPLETED",
      exercises: { create: [] },
    },
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

describe("GET /workouts (integration)", () => {
  it("returns all workouts for user when no query params are provided", async () => {
    const res = await request(app).get("/workouts");
    expect(res.status).toBe(200);

    // Response should have success:true and a data.workouts array
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("data.workouts");
    const workouts = res.body.data.workouts;

    // We seeded exactly 4 workouts belonging to “test-user” (IDs: #1, #2, #3, #5),
    // because #4 belonged to "other-user" and should be omitted.
    expect(Array.isArray(workouts)).toBe(true);
    expect(workouts.length).toBe(4);

    // Verify that none of the returned workouts has userId !== “test-user”
    workouts.forEach((w: any) => {
      expect(w.userId).toBe("test-user");
      expect(w).toHaveProperty("scheduledAt");
      expect(w).toHaveProperty("status");
    });

    // Check that they are sorted by scheduledAt descending (latest first)
    const dates = workouts.map((w: any) => new Date(w.scheduledAt).getTime());
    for (let i = 0; i < dates.length - 1; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
    }
  });

  it("filters by status only", async () => {
    // Only completed for user “test-user”
    const res = await request(app)
      .get("/workouts")
      .query({ status: "completed" });
    expect(res.status).toBe(200);

    const workouts = res.body.data.workouts;
    // We seeded two completed workouts for “test-user”: on 2025-06-01 and 2025-06-20.
    expect(Array.isArray(workouts)).toBe(true);
    expect(workouts.length).toBe(2);

    // Every returned workout.status should be “completed”
    workouts.forEach((w: any) => expect(w.status).toBe("COMPLETED"));
  });

  it("filters by start only", async () => {
    // start = 2025-06-05 → should return workouts on 06-05, 06-10, 06-20 (all ≥ June 5)
    const res = await request(app)
      .get("/workouts")
      .query({ start: "2025-06-05T00:00:00.000Z" });
    expect(res.status).toBe(200);

    const workouts = res.body.data.workouts;
    // Of the four for test-user, 06-01 is before June 5, so omit it.
    // We expect three: 06-05, 06-10, 06-20
    expect(workouts.length).toBe(3);
    workouts.forEach((w: any) => {
      const dt = new Date(w.scheduledAt).getTime();
      expect(dt).toBeGreaterThanOrEqual(
        new Date("2025-06-05T00:00:00.000Z").getTime()
      );
    });
  });

  it("filters by end only", async () => {
    // end = 2025-06-05T23:59:59 → should return workouts on 06-01 and 06-05 (both ≤ June 5)
    const res = await request(app)
      .get("/workouts")
      .query({ end: "2025-06-05T23:59:59.000Z" });
    expect(res.status).toBe(200);

    const workouts = res.body.data.workouts;
    // Of the four for test-user: 06-01 and 06-05 are ≤ June 5
    expect(workouts.length).toBe(2);
    workouts.forEach((w: any) => {
      const dt = new Date(w.scheduledAt).getTime();
      expect(dt).toBeLessThanOrEqual(
        new Date("2025-06-05T23:59:59.000Z").getTime()
      );
    });
  });

  it("filters by both start and end", async () => {
    // Between 2025-06-02 and 2025-06-15 inclusive: should catch 06-05 and 06-10
    const res = await request(app).get("/workouts").query({
      start: "2025-06-02T00:00:00.000Z",
      end: "2025-06-15T23:59:59.000Z",
    });
    expect(res.status).toBe(200);

    const workouts = res.body.data.workouts;
    // Expect two workouts for test-user in that range: 06-05 and 06-10
    expect(workouts.length).toBe(2);
    workouts.forEach((w: any) => {
      const dt = new Date(w.scheduledAt).getTime();
      expect(dt).toBeGreaterThanOrEqual(
        new Date("2025-06-02T00:00:00.000Z").getTime()
      );
      expect(dt).toBeLessThanOrEqual(
        new Date("2025-06-15T23:59:59.000Z").getTime()
      );
    });
  });

  it("filters by status, start, and end all together", async () => {
    // status=completed, start=2025-06-01, end=2025-06-10
    // That should pick only the 2025-06-01 completed workout
    const res = await request(app).get("/workouts").query({
      status: "completed",
      start: "2025-06-01T00:00:00.000Z",
      end: "2025-06-10T23:59:59.000Z",
    });

    expect(res.status).toBe(200);

    const workouts = res.body.data.workouts;
    // Only one matches: the 2025-06-01 completed workout
    expect(workouts.length).toBe(1);
    expect(workouts[0].status).toBe("COMPLETED");
    expect(workouts[0].scheduledAt).toBe("2025-06-01T08:00:00.000Z");
  });

  it("returns 400 if start is malformed", async () => {
    const res = await request(app)
      .get("/workouts")
      .query({ start: "not-a-date" });

    expect(res.status).toBe(400);

    expect(res.body).toHaveProperty("success", false);
    expect(Array.isArray(res.body.errors)).toBe(true);

    expect(res.body.errors[0]).toMatchObject({
      type: "field",
      value: "not-a-date",
      msg: expect.stringMatching(/must be a valid ISO-8601 date/i),
      path: "start",
      location: "query",
    });
  });

  it("returns 400 if end is malformed", async () => {
    const res = await request(app)
      .get("/workouts")
      .query({ end: "2025-13-99T00:00:00.000Z" });

    expect(res.status).toBe(400);

    expect(res.body).toHaveProperty("success", false);
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors[0]).toMatchObject({
      path: "end",
      msg: expect.stringMatching(/must be a valid ISO-8601 date/i),
    });
  });

  it("returns 400 if status is not a valid enum", async () => {
    const res = await request(app)
      .get("/workouts")
      .query({ status: "NOT_A_STATUS" });

    expect(res.status).toBe(400);

    expect(res.body).toHaveProperty("success", false);
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors[0]).toMatchObject({
      path: "status",
      msg: expect.stringMatching(/status.*(PENDING|COMPLETED|CANCELLED)/i),
      location: "query",
    });
  });
});
