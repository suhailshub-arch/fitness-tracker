import { NextFunction, Request, Response } from "express";
import { postCommentService } from "../services/comments.service.js";

export interface ICommentBody {
  text: string;
}

export const postCommentController = async (
  req: Request<{ workoutId: string }, {}, ICommentBody>,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user!.userId;
  const { text } = req.body;
  const { workoutId } = req.params;
  const posted = await postCommentService({ text, userId, workoutId });
  res.status(201).json({
    success: true,
    data: { posted },
  });
};
