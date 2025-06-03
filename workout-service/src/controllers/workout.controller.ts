import { NextFunction, Request, Response } from "express";
import { createWorkout, getWorkouts } from "../services/workout.service.js";
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
