import { NextFunction, Request, Response } from "express";
import { createWorkout } from "../services/workout.service.js";
import { BadRequest } from "../utils/ApiError.js";

export interface IExerciseSlot {
  exerciseId: string;
  targetReps?: number;
  targetSets?: number;
}

interface IWorkoutBody {
  scheduledAt: string;
  exercises?: IExerciseSlot[];
}

export const createWorkoutController = async (
  req: Request<{}, {}, IWorkoutBody>,
  res: Response,
  next: NextFunction
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
