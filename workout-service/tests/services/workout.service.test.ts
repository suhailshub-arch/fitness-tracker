jest.mock("../../src/prismaClient", () => {
  return {
    prisma: {
      workout: {
        create: jest.fn(), // prisma.workout.create will be a jest.fn()
      },
    },
  };
});

import {
  createWorkout,
  CreateWorkoutParams,
} from "../../src/services/workout.service";
import { prisma } from "../../src/prismaClient";

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
