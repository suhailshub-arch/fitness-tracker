// src/controllers/workout.controller.ts
import { Request, Response } from "express";
import {
  createWorkout,
  deleteWorkout,
  getWorkout,
  getWorkouts,
  updateWorkout,
  UpdateWorkoutParams,
} from "../services/workout.service.js";
import { BadRequest } from "../utils/ApiError.js";
import { ParsedQs } from "qs";

export interface IExerciseSlot {
  exerciseId: string;
  targetReps?: number;
  targetSets?: number;
}

interface IWorkoutBody {
  scheduledAt: string;
  exercises?: IExerciseSlot[];
}

interface IQueryParams extends ParsedQs {
  status?: "pending" | "completed" | undefined;
  start?: string;
  end?: string;
}

export interface IWorkoutUpdateBody {
  scheduledAt?: string;
  exercises?: {
    exerciseId: string;
    targetReps?: number;
    targetSets?: number;
  }[];
  status?: "PENDING" | "COMPLETED" | "CANCELLED";
}

function getQueryString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

export const createWorkoutController = async (
  req: Request<{}, {}, IWorkoutBody>,
  res: Response
) => {
  const userId = req.user!.userId;
  const { scheduledAt, exercises } = req.body;
  if (!scheduledAt) {
    throw BadRequest("Request must have Schedule Time");
  }
  const created = await createWorkout({ userId, scheduledAt, exercises });
  res.status(201).json({
    success: true,
    data: {
      workout: created,
    },
  });
};

export const getAllWorkoutController = async (
  req: Request<{}, {}, {}, IQueryParams>,
  res: Response
) => {
  const status = getQueryString(req.query.status);
  const start = getQueryString(req.query.start);
  const end = getQueryString(req.query.end);
  const userId = req.user!.userId;

  const workouts = await getWorkouts({ userId, status, start, end });
  res.status(200).json({
    success: true,
    data: { workouts },
  });
};

export const getSingleWorkoutController = async (
  req: Request<{ workoutId: string }>,
  res: Response
) => {
  const userId = req.user!.userId;
  const { workoutId } = req.params;

  const workout = await getWorkout({ userId, workoutId });
  res.status(200).json({
    success: true,
    data: { workout },
  });
};

export const updateWorkoutController = async (
  req: Request<{ workoutId: string }, {}, IWorkoutUpdateBody>,
  res: Response
) => {
  const userId = req.user!.userId;
  const workoutId = req.params.workoutId;
  const { scheduledAt, status, exercises } = req.body;

  const params: UpdateWorkoutParams = {
    userId,
    workoutId,
    ...(scheduledAt !== undefined && { scheduledAt }),
    ...(status !== undefined && { status }),
    ...(exercises !== undefined && { exercises }),
  };

  const updated = await updateWorkout(params);
  res.status(200).json({
    success: true,
    data: { workout: updated },
  });
};

export const deleteWorkoutController = async (
  req: Request<{ workoutId: string }>,
  res: Response
) => {
  const userId = req.user!.userId;
  const workoutId = req.params.workoutId;

  const deleted = await deleteWorkout({ workoutId, userId });
  res.status(200).json({
    success: true,
    data: { workout: deleted },
  });
};
