import { Router } from "express";
import { markExerciseStatusController } from "../controllers/exercises.controller.js";

const exerciseRouter = Router({ mergeParams: true });

exerciseRouter.patch(
  "/:exerciseEntryId",
  markExerciseStatusController
);

export default exerciseRouter;
