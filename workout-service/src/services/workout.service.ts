import { prisma } from "../prismaClient.js";
import {
  IExerciseSlot,
  IWorkoutUpdateBody,
} from "../controllers/workout.controller.js";
import { BadRequest, NotFound } from "../utils/ApiError.js";
import { WorkoutStatus } from "@prisma/client";

export interface CreateWorkoutParams {
  userId: string;
  scheduledAt: string; // ISO string from the client
  exercises?: IExerciseSlot[]; // array of { exerciseId, targetReps?, targetSets? }
}

export interface GetWorkoutParams {
  userId: string;
  status?: string;
  start?: string;
  end?: string;
}

export interface UpdateWorkoutParams {
  userId: string;
  workoutId: string;
  scheduledAt?: string;
  status?: WorkoutStatus;
  exercises?: {
    exerciseId: string;
    targetReps?: number;
    targetSets?: number;
  }[];
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

export const getWorkouts = async (params: GetWorkoutParams) => {
  const { userId, status, start, end } = params;

  const whereClause: any = { userId };
  status && (whereClause.status = status.toUpperCase());

  if (start) {
    const parsedStart = new Date(start);
    if (isNaN(parsedStart.getTime())) {
      throw BadRequest("`start` is not a valid date");
    }
    whereClause.scheduledAt = {
      ...(whereClause.scheduledAt || {}),
      gte: parsedStart,
    };
  }

  if (end) {
    const parsedEnd = new Date(end);
    if (isNaN(parsedEnd.getTime())) {
      throw BadRequest("`end` is not a valid date");
    }
    whereClause.scheduledAt = {
      ...(whereClause.scheduledAt || {}),
      lte: parsedEnd,
    };
  }

  const workouts = await prisma.workout.findMany({
    where: whereClause,
    orderBy: { scheduledAt: "desc" },
    include: {
      exercises: {
        include: {
          exercise: true,
        },
      },
      comments: true,
    },
  });
  return workouts;
};

export const getWorkout = async (params: {
  userId: string;
  workoutId: string;
}) => {
  const { userId, workoutId } = params;
  const workout = await prisma.workout.findUnique({
    where: {
      userId,
      id: workoutId,
    },
  });
  if (!workout) {
    throw NotFound("Workout not found");
  }
  return workout;
};

export const updateWorkout = async (params: UpdateWorkoutParams) => {
  const { userId, workoutId, scheduledAt, status, exercises } = params;

  const existing = await prisma.workout.findUnique({
    where: { userId, id: workoutId },
    select: { id: true },
  });
  if (!existing) {
    throw NotFound("Workout not found");
  }

  const dataToUpdate: any = {};

  if (scheduledAt) {
    const parsed = new Date(scheduledAt);
    if (isNaN(parsed.getTime())) {
      throw BadRequest("`scheduledAt` must be a valid ISO-8601 date");
    }
    dataToUpdate.scheduledAt = parsed;
  }

  if (status) {
    dataToUpdate.status = status;
  }

  if (exercises) {
    const nested = exercises.map((slot, idx) => ({
      exercise: { connect: { id: slot.exerciseId } },
      sequence: idx + 1,
      targetReps: slot.targetReps ?? undefined,
      targetSets: slot.targetSets ?? undefined,
    }));

    dataToUpdate.exercises = {
      deleteMany: {},
      create: nested,
    };
  }
  const updated = await prisma.workout.update({
    where: { id: workoutId, userId },
    data: dataToUpdate,
    include: {
      exercises: { include: { exercise: true }, orderBy: { sequence: "asc" } },
      comments: true,
    },
  });

  return updated;
};
