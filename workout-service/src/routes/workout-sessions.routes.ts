import { Router } from "express";
import { query } from "express-validator";
import { handleValidationErrors } from "../middleware/paramValidation.middleware.js";

const workoutSessionRouter = Router();

workoutSessionRouter.post("/workouts", () => {});

workoutSessionRouter.get(
  "/workouts",
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
  () => {}
);

workoutSessionRouter.get("/workouts/:workoutId", () => {});

workoutSessionRouter.patch("/workouts/:workoutId", () => {});

workoutSessionRouter.delete("/workouts/:workoutId", () => {});

export default workoutSessionRouter;
