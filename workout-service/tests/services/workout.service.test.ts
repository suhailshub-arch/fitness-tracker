jest.mock("../../src/prismaClient", () => {
  return {
    prisma: {
      workout: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    },
  };
});

import {
  createWorkout,
  CreateWorkoutParams,
  getWorkouts,
  getWorkout,
  updateWorkout,
  UpdateWorkoutParams,
} from "../../src/services/workout.service.js";
import { prisma } from "../../src/prismaClient.js";
import { param } from "express-validator";

describe("createWorkout", () => {
  it("should map 'CreateWorkoutParams' to the correct Prisma call and return its result", async () => {
    const fakeResult = {
      id: "w1",
      userId: "user123",
      scheduledAt: new Date("2025-06-15T09:30:00.000Z"),
      exercises: [
        {
          id: "we1",
          workoutId: "w1",
          exerciseId: "ex1",
          sequence: 1,
          targetReps: 12,
          targetSets: 3,
          completed: false,
          actualReps: null,
          actualSets: null,
          notes: null,
          exercise: {
            id: "ex1",
            name: "Push-up",
            description: "…",
            defaultReps: 15,
            defaultSets: 3,
          },
        },
        {
          id: "we2",
          workoutId: "w1",
          exerciseId: "ex2",
          sequence: 2,
          targetReps: 10,
          targetSets: 4,
          completed: false,
          actualReps: null,
          actualSets: null,
          notes: null,
          exercise: {
            id: "ex2",
            name: "Squat",
            description: "…",
            defaultReps: 12,
            defaultSets: 4,
          },
        },
      ],
    };

    (prisma.workout.create as jest.Mock).mockResolvedValue(fakeResult);

    const params: CreateWorkoutParams = {
      userId: "user123",
      scheduledAt: "2025-06-15T09:30:00.000Z",
      exercises: [
        {
          exerciseId: "ex1",
          targetReps: 12,
          targetSets: 3,
        },
        {
          exerciseId: "ex2",
          targetReps: 10,
          targetSets: 4,
        },
      ],
    };

    const result = await createWorkout(params);

    expect(prisma.workout.create).toHaveBeenCalledTimes(1);

    const calledWith = (prisma.workout.create as jest.Mock).mock.calls[0][0];
    expect(calledWith).toEqual({
      data: {
        userId: "user123",
        scheduledAt: new Date("2025-06-15T09:30:00.000Z"),
        exercises: {
          create: [
            {
              exercise: { connect: { id: "ex1" } },
              sequence: 1,
              targetReps: 12,
              targetSets: 3,
            },
            {
              exercise: { connect: { id: "ex2" } },
              sequence: 2,
              targetReps: 10,
              targetSets: 4,
            },
          ],
        },
      },
      include: {
        exercises: {
          include: { exercise: true },
        },
      },
    });

    expect(result).toBe(fakeResult);
  });

  it("should handle the case when `exercises` is undefined (insert only Workout row)", async () => {
    const fakeEmptyResult = {
      id: "w2",
      userId: "user999",
      scheduledAt: new Date("2025-07-01T10:00:00.000Z"),
      exercises: [], // no nested exercises created
    };

    (prisma.workout.create as jest.Mock).mockResolvedValue(fakeEmptyResult);

    const params: CreateWorkoutParams = {
      userId: "user999",
      scheduledAt: "2025-07-01T10:00:00.000Z",
      // exercises is undefined
    };

    const result = await createWorkout(params);

    expect(prisma.workout.create).toHaveBeenCalledTimes(1);

    const calledWith = (prisma.workout.create as jest.Mock).mock.calls[0][0];
    expect(calledWith).toEqual({
      data: {
        userId: "user999",
        scheduledAt: new Date("2025-07-01T10:00:00.000Z"),
        exercises: {
          create: [], // because exercises was undefined
        },
      },
      include: {
        exercises: {
          include: { exercise: true },
        },
      },
    });

    expect(result).toBe(fakeEmptyResult);
  });
});

describe("getWorkouts", () => {
  it("returns all workouts for a user when no filters are provided", async () => {
    const fakeReturn = [
      {
        id: "w1",
        userId: "1",
        scheduledAt: new Date("2025-06-01T08:00:00.000Z"),
        status: "COMPLETED",
        exercises: [],
        comments: [],
      },
      {
        id: "w2",
        userId: "1",
        scheduledAt: new Date("2025-05-28T14:30:00.000Z"),
        status: "PENDING",
        exercises: [],
        comments: [],
      },
    ];

    (prisma.workout.findMany as jest.Mock).mockResolvedValue(fakeReturn);

    const params = { userId: "1" };
    const result = await getWorkouts(params);

    const calledWith = (prisma.workout.findMany as jest.Mock).mock.calls[0][0];
    expect(calledWith.where).toEqual({ userId: "1" });

    expect(result).toBe(fakeReturn);
  });

  it("filters by status if provided", async () => {
    const fakeReturn: any[] = [
      {
        id: "w3",
        userId: "1",
        scheduledAt: new Date("2025-06-10T10:00:00.000Z"),
        status: "PENDING",
        exercises: [],
        comments: [],
      },
    ];
    (prisma.workout.findMany as jest.Mock).mockResolvedValue(fakeReturn);

    const params = { userId: "1", status: "PENDING" };
    const result = await getWorkouts(params);

    const { where } = (prisma.workout.findMany as jest.Mock).mock.calls[0][0];
    expect(where).toEqual({
      userId: "1",
      status: "PENDING",
    });
    expect(result).toBe(fakeReturn);
  });

  it("filters by start only", async () => {
    const fakeReturn: any[] = [
      {
        id: "w4",
        userId: "1",
        scheduledAt: new Date("2025-07-01T12:00:00.000Z"),
        status: "COMPLETED",
        exercises: [],
        comments: [],
      },
    ];
    (prisma.workout.findMany as jest.Mock).mockResolvedValue(fakeReturn);

    // Act: user provided only start
    const params = {
      userId: "1",
      start: "2025-07-01T00:00:00.000Z",
    };
    const result = await getWorkouts(params);

    // Assert: where should be { userId: "1", scheduledAt: { gte: <Date("2025-07-01T00:00:00.000Z")> } }
    const { where } = (prisma.workout.findMany as jest.Mock).mock.calls[0][0];
    expect(where.userId).toBe("1");
    expect(where.scheduledAt).toEqual({
      gte: new Date("2025-07-01T00:00:00.000Z"),
    });
    expect(result).toBe(fakeReturn);
  });

  it("filters by end only", async () => {
    const fakeReturn: any[] = [
      {
        id: "w5",
        userId: "1",
        scheduledAt: new Date("2025-06-05T09:00:00.000Z"),
        status: "CANCELLED",
        exercises: [],
        comments: [],
      },
    ];
    (prisma.workout.findMany as jest.Mock).mockResolvedValue(fakeReturn);

    // Act: user provided only end
    const params = {
      userId: "1",
      end: "2025-06-10T23:59:59.000Z",
    };
    const result = await getWorkouts(params);

    // Assert: where should be { userId: "1", scheduledAt: { lte: <Date("2025-06-10T23:59:59.000Z")> } }
    const { where } = (prisma.workout.findMany as jest.Mock).mock.calls[0][0];
    expect(where.userId).toBe("1");
    expect(where.scheduledAt).toEqual({
      lte: new Date("2025-06-10T23:59:59.000Z"),
    });
    expect(result).toBe(fakeReturn);
  });

  it("filters by both start and end", async () => {
    const fakeReturn: any[] = [
      {
        id: "w6",
        userId: "1",
        scheduledAt: new Date("2025-07-05T15:00:00.000Z"),
        status: "PENDING",
        exercises: [],
        comments: [],
      },
    ];
    (prisma.workout.findMany as jest.Mock).mockResolvedValue(fakeReturn);

    // Act: user provided both start and end
    const params = {
      userId: "1",
      start: "2025-07-01T00:00:00.000Z",
      end: "2025-07-10T23:59:59.000Z",
    };
    const result = await getWorkouts(params);

    // Assert: where should merge both gte & lte
    const { where } = (prisma.workout.findMany as jest.Mock).mock.calls[0][0];
    expect(where.userId).toBe("1");
    expect(where.scheduledAt).toEqual({
      gte: new Date("2025-07-01T00:00:00.000Z"),
      lte: new Date("2025-07-10T23:59:59.000Z"),
    });
    expect(result).toBe(fakeReturn);
  });

  it("filters by status, start, and end all together", async () => {
    const fakeReturn: any[] = [
      {
        id: "w7",
        userId: "1",
        scheduledAt: new Date("2025-08-05T10:00:00.000Z"),
        status: "COMPLETED",
        exercises: [],
        comments: [],
      },
    ];
    (prisma.workout.findMany as jest.Mock).mockResolvedValue(fakeReturn);

    // Act: user provided status + both dates
    const params = {
      userId: "1",
      status: "COMPLETED",
      start: "2025-08-01T00:00:00.000Z",
      end: "2025-08-31T23:59:59.000Z",
    };
    const result = await getWorkouts(params);

    // Assert: where should include all three keys
    const { where } = (prisma.workout.findMany as jest.Mock).mock.calls[0][0];
    expect(where).toEqual({
      userId: "1",
      status: "COMPLETED",
      scheduledAt: {
        gte: new Date("2025-08-01T00:00:00.000Z"),
        lte: new Date("2025-08-31T23:59:59.000Z"),
      },
    });
    expect(result).toBe(fakeReturn);
  });

  it("throws if start is not a valid date", async () => {
    // Arrange: we expect an exception before calling Prisma at all
    const params = {
      userId: "1",
      start: "not-a-date",
    };

    // Act & Assert: calling getWorkouts should reject with our error
    await expect(getWorkouts(params)).rejects.toThrow(
      "`start` is not a valid date"
    );

    // Ensure that Prisma was never called
    expect(prisma.workout.findMany as jest.Mock).not.toHaveBeenCalled();
  });

  it("throws if end is not a valid date", async () => {
    const params = {
      userId: "1",
      end: "2025-13-99T99:99:99.000Z", // definitely invalid
    };
    await expect(getWorkouts(params)).rejects.toThrow(
      "`end` is not a valid date"
    );
    expect(prisma.workout.findMany as jest.Mock).not.toHaveBeenCalled();
  });
});

describe("get workout by Id", () => {
  it("returns single workout for a user based on workout id provided", async () => {
    const fakeResult = {
      id: "1",
      userId: "u1",
      scheduledAt: new Date("2025-06-01T08:00:00.000Z"),
      status: "COMPLETED",
      exercises: [],
      comments: [],
    };

    (prisma.workout.findUnique as jest.Mock).mockResolvedValue(fakeResult);
    const res = await getWorkout({ userId: "u1", workoutId: "1" });

    expect(res).toEqual(fakeResult);
  });

  it("throws error when record is not found", async () => {
    (prisma.workout.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      getWorkout({ userId: "1", workoutId: "fake-id" })
    ).rejects.toThrow("Workout not found");
  });
});

describe("updateWorkout service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("successfully updates scheduledAt and nested exercises when workout exists", async () => {
    // Arrange
    const userId = "user‐123";
    const workoutId = "wk‐abc";
    const updateParams: UpdateWorkoutParams = {
      userId,
      workoutId,
      scheduledAt: "2025-07-01T10:00:00.000Z",
      status: "PENDING",
      exercises: [
        { exerciseId: "ex‐1", targetReps: 12, targetSets: 3 },
        { exerciseId: "ex‐2", targetReps: 10, targetSets: 4 },
      ],
    };

    // 1) Simulate that workout.findUnique succeeds (i.e. the workout exists)
    (prisma.workout.findUnique as jest.Mock).mockResolvedValue({
      id: workoutId,
    } as any);

    // 2) Simulate that workout.update returns an “updated” object
    const fakeUpdatedWorkout = {
      id: workoutId,
      userId,
      scheduledAt: new Date("2025-07-01T10:00:00.000Z"),
      status: "PENDING",
      exercises: [
        {
          id: "we‐100",
          workoutId,
          exerciseId: "ex‐1",
          sequence: 1,
          targetReps: 12,
          targetSets: 3,
          completed: false,
          actualReps: null,
          actualSets: null,
          notes: null,
          exercise: {
            id: "ex‐1",
            name: "Push-up",
            description: "",
            defaultReps: 15,
            defaultSets: 3,
          },
        },
        {
          id: "we‐101",
          workoutId,
          exerciseId: "ex‐2",
          sequence: 2,
          targetReps: 10,
          targetSets: 4,
          completed: false,
          actualReps: null,
          actualSets: null,
          notes: null,
          exercise: {
            id: "ex‐2",
            name: "Squat",
            description: "",
            defaultReps: 12,
            defaultSets: 4,
          },
        },
      ],
      comments: [],
    };
    (prisma.workout.update as jest.Mock).mockResolvedValue(
      fakeUpdatedWorkout as any
    );

    // Act
    const result = await updateWorkout(updateParams);

    // Assert
    expect(prisma.workout.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.workout.findUnique).toHaveBeenCalledWith({
      where: { id: workoutId, userId },
      select: { id: true },
    });

    // Check that the “data” object passed into Prisma matches what we expect:
    expect(prisma.workout.update).toHaveBeenCalledTimes(1);
    const updateCallArgs = (prisma.workout.update as jest.Mock).mock
      .calls[0][0];
    expect(updateCallArgs.where).toEqual({ id: workoutId, userId });

    // scheduledAt should have been converted to a Date
    expect(updateCallArgs.data.scheduledAt).toBeInstanceOf(Date);
    expect((updateCallArgs.data.scheduledAt as Date).toISOString()).toBe(
      "2025-07-01T10:00:00.000Z"
    );

    // status should be passed through
    expect(updateCallArgs.data.status).toBe("PENDING");

    // Nested exercises: first deleteMany, then create an array of two items with the proper “sequence”
    expect(updateCallArgs.data.exercises).toEqual({
      deleteMany: {},
      create: [
        {
          exercise: { connect: { id: "ex‐1" } },
          sequence: 1,
          targetReps: 12,
          targetSets: 3,
        },
        {
          exercise: { connect: { id: "ex‐2" } },
          sequence: 2,
          targetReps: 10,
          targetSets: 4,
        },
      ],
    });

    // And the returned result should be exactly our fakeUpdatedWorkout
    expect(result).toBe(fakeUpdatedWorkout);
  });

  it("throws NotFound if the workout does not exist or belongs to a different user", async () => {
    // Arrange
    const userId = "user‐123";
    const workoutId = "wk‐missing";
    (prisma.workout.findUnique as jest.Mock).mockResolvedValue(null);

    // Act & Assert
    await expect(updateWorkout({ userId, workoutId })).rejects.toThrow(
      "Workout not found"
    );

    // Prisma.update should never be called if findUnique returned null
    expect(prisma.workout.update).not.toHaveBeenCalled();
  });

  it("throws ApiError(400) if scheduledAt is not a valid ISO date", async () => {
    // Arrange: findUnique must return something so we get past the “not found” check
    const userId = "user‐123";
    const workoutId = "wk‐abc";
    (prisma.workout.findUnique as jest.Mock).mockResolvedValue({
      id: workoutId,
    } as any);

    // Give an invalid date string:
    const badParams: UpdateWorkoutParams = {
      userId,
      workoutId,
      scheduledAt: "not‐a‐date",
    };

    // Act & Assert
    await expect(updateWorkout(badParams)).rejects.toThrow(
      "`scheduledAt` must be a valid ISO-8601 date"
    );
    expect(prisma.workout.update).not.toHaveBeenCalled();
  });
});
