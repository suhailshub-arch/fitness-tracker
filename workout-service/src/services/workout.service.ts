import { prisma } from "../prismaClient.js";
import { IExerciseSlot } from "../controllers/workout.controller.js";
import { BadRequest } from "../utils/ApiError.js";

export interface CreateWorkoutParams {
  userId: string;
  scheduledAt: string; // ISO string from the client
  exercises?: IExerciseSlot[]; // array of { exerciseId, targetReps?, targetSets? }
}

export const createWorkout = async (params: CreateWorkoutParams) => {
  const { userId, scheduledAt, exercises } = params;

  const nestedExercise = (exercises || []).map((slot, idx) => ({
    exercise: { connect: { id: slot.exerciseId } },
    sequence: idx + 1,
    targetReps: slot.targetReps ?? undefined,
    targetSets: slot.targetSets ?? undefined,
  }));
  const scheduledAtDate = new Date(scheduledAt);
  if (isNaN(scheduledAtDate.getTime())) {
  // parsing failed
  throw BadRequest("Date must be in ISO Format");
}

  const workout = await prisma.workout.create({
    data: {
      userId: userId,
      scheduledAt: scheduledAtDate,
      exercises: {
        create: nestedExercise,
      },
    },
    include: {
      exercises: {
        include: {
          exercise: true,
        },
      },
    },
  });
  return workout;
};
