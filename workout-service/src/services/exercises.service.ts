import { prisma } from "../prismaClient.js";
import { BadRequest, NotFound } from "../utils/ApiError.js";

export interface IUpdateExerciseParams {
  userId: string;
  workoutId: string;
  exerciseEntryId: string;
  completed: boolean;
  actualReps?: number;
  actualSets?: number;
}

export async function updateExercise(params: IUpdateExerciseParams) {
  const {
    userId,
    workoutId,
    exerciseEntryId,
    completed,
    actualReps,
    actualSets,
  } = params;

  if (typeof completed !== "boolean") {
    throw BadRequest("`done` must be true or false");
  }

  if (
    actualReps !== undefined &&
    (typeof actualReps !== "number" || actualReps < 0)
  ) {
    throw BadRequest("`actualReps` must be a non‐negative number");
  }

  if (
    actualSets !== undefined &&
    (typeof actualSets !== "number" || actualSets < 0)
  ) {
    throw BadRequest("`actualSets` must be a non‐negative number");
  }

  const updateData: {
    completed: boolean;
    actualReps?: number;
    actualSets?: number;
  } = { completed };

  if (actualReps !== undefined) updateData.actualReps = actualReps;
  if (actualSets !== undefined) updateData.actualSets = actualSets;

  const result = await prisma.workoutExercise.updateMany({
    where: {
      id: exerciseEntryId,
      workoutId: workoutId,
      workout: { userId: userId },
    },
    data: updateData,
  });

  if (result.count === 0) {
    throw NotFound("Exercise entry not found");
  }

  const updatedEntry = await prisma.workoutExercise.findUnique({
    where: { id: exerciseEntryId },
    include: { exercise: true },
  });

  if (!updatedEntry) {
    throw NotFound("Exercise entry not found");
  }

  return updatedEntry;
}
