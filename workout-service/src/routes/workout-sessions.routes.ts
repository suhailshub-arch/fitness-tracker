import { Router } from "express";
import { query } from "express-validator";
import { handleValidationErrors } from "../middleware/paramValidation.middleware.js";
import {
  createWorkoutController,
  deleteWorkoutController,
  getAllWorkoutController,
  getSingleWorkoutController,
  updateWorkoutController,
} from "../controllers/workout.controller.js";

const workoutSessionRouter = Router();

workoutSessionRouter.post("/", createWorkoutController);

workoutSessionRouter.get(
  "/",
  [
    query("status")
      .optional()
      .isIn(["pending", "completed"])
      .withMessage("Status should be pending or completed")
      .escape(),
    query("start")
      .optional()
      .isISO8601()
      .withMessage("start must be a valid ISO-8601 date")
      .escape(),
    query("end")
      .optional()
      .isISO8601()
      .withMessage("end must be a valid ISO-8601 date")
      .escape(),
    handleValidationErrors,
  ],
  getAllWorkoutController
);

workoutSessionRouter.get("/:workoutId", getSingleWorkoutController);

workoutSessionRouter.patch("/:workoutId", updateWorkoutController);

workoutSessionRouter.delete("/:workoutId", deleteWorkoutController);

export default workoutSessionRouter;
