import { prisma } from "../prismaClient.js";
import { IExerciseSlot } from "../controllers/workout.controller.js";

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
  const workout = await prisma.workout.create({
    data: {
      userId: userId,
      scheduledAt: new Date(scheduledAt),
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
