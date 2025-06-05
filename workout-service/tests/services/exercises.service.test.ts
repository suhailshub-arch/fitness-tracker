jest.mock("../../src/prismaClient", () => {
  return {
    prisma: {
      workoutExercise: {
        updateMany: jest.fn(),
        findUnique: jest.fn(),
      },
    },
  };
});

import { prisma } from "../../src/prismaClient.js";
import {
  updateExercise,
  IUpdateExerciseParams,
} from "../../src/services/exercises.service.js";
import { NotFound, BadRequest } from "../../src/utils/ApiError.js";

describe("updateExercise service", () => {
  it("successfully updates a junction row when inputs are valid and it belongs to the user", async () => {
    const params: IUpdateExerciseParams = {
      userId: "user123",
      workoutId: "workoutABC",
      exerciseEntryId: "entryXYZ",
      completed: true,
      actualReps: 12,
      actualSets: 3,
    };

    // Simulate updateMany affecting exactly one row:
    (prisma.workoutExercise.updateMany as jest.Mock).mockResolvedValue({
      count: 1,
    });

    // Return a fake updated row on findUnique:
    const fakeRow = {
      id: "entryXYZ",
      workoutId: "workoutABC",
      exerciseId: "ex1",
      sequence: 2,
      targetReps: 10,
      targetSets: 4,
      completed: true,
      actualReps: 12,
      actualSets: 3,
      notes: null,
      exercise: {
        id: "ex1",
        name: "Push-up",
        description: "",
        defaultReps: 15,
        defaultSets: 3,
      },
    };
    (prisma.workoutExercise.findUnique as jest.Mock).mockResolvedValue(
      fakeRow as any
    );

    const result = await updateExercise(params);

    expect(prisma.workoutExercise.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.workoutExercise.updateMany).toHaveBeenCalledWith({
      where: {
        id: "entryXYZ",
        workoutId: "workoutABC",
        workout: { userId: "user123" },
      },
      data: { completed: true, actualReps: 12, actualSets: 3 },
    });

    expect(prisma.workoutExercise.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.workoutExercise.findUnique).toHaveBeenCalledWith({
      where: { id: "entryXYZ" },
      include: { exercise: true },
    });

    expect(result).toBe(fakeRow);
  });

  it("throws BadRequest if `completed` is not boolean or actualReps/actualSets are invalid", async () => {
    // Case 1: completed is not boolean
    await expect(
      updateExercise({
        userId: "u1",
        workoutId: "w1",
        exerciseEntryId: "e1",
        // @ts-ignore
        completed: "yes",
      })
    ).rejects.toThrow(BadRequest("`done` must be true or false"));

    // Case 2: actualReps is negative
    await expect(
      updateExercise({
        userId: "u1",
        workoutId: "w1",
        exerciseEntryId: "e1",
        completed: false,
        actualReps: -5,
      })
    ).rejects.toThrow(BadRequest("`actualReps` must be a non‐negative number"));

    // Case 3: actualSets is not a number
    await expect(
      updateExercise({
        userId: "u1",
        workoutId: "w1",
        exerciseEntryId: "e1",
        completed: false,
        // @ts-ignore
        actualSets: "three",
      })
    ).rejects.toThrow(BadRequest("`actualSets` must be a non‐negative number"));

    expect(prisma.workoutExercise.updateMany).not.toHaveBeenCalled();
    expect(prisma.workoutExercise.findUnique).not.toHaveBeenCalled();
  });

  it("throws NotFound if updateMany returns count 0 (no matching or unauthorized)", async () => {
    const params: IUpdateExerciseParams = {
      userId: "userABC",
      workoutId: "wk123",
      exerciseEntryId: "entry999",
      completed: true,
    };

    // Simulate no rows updated
    (prisma.workoutExercise.updateMany as jest.Mock).mockResolvedValue({
      count: 0,
    });

    await expect(updateExercise(params)).rejects.toThrow(
      NotFound("Exercise entry not found")
    );
    await expect(updateExercise(params)).rejects.toThrow(
      "Exercise entry not found"
    );

    expect(prisma.workoutExercise.updateMany).toHaveBeenCalledTimes(2); // called twice above
    expect(prisma.workoutExercise.findUnique).not.toHaveBeenCalled();
  });
});
