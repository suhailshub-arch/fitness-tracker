import { Request, RequestHandler, Response } from "express";
import { BadRequest } from "../utils/ApiError.js";
import {
  IUpdateExerciseParams,
  updateExercise,
} from "../services/exercises.service.js";

export interface IUpdateExerciseBody {
  completed: boolean;
  actualReps?: number;
  actualSets?: number;
}

export const markExerciseStatusController: RequestHandler<
  { workoutId: string; exerciseEntryId: string },
  any,
  IUpdateExerciseBody,
  any
> = async (req, res, next) => {
  const userId = req.user!.userId;
  const workoutId = req.params.workoutId;
  const exerciseEntryId = req.params.exerciseEntryId;
  const { completed, actualReps, actualSets } = req.body;

  if (completed === undefined) {
    throw BadRequest("Missing required field: `completed`");
  }

  const params: IUpdateExerciseParams = {
    userId,
    workoutId,
    exerciseEntryId,
    completed,
    actualReps,
    actualSets,
  };

  const updatedEntry = await updateExercise(params);

  res.status(200).json({
    success: true,
    data: { workoutExercise: updatedEntry },
  });
};
