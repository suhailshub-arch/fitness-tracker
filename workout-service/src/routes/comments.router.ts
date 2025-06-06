import { Router } from "express";
import { postCommentController } from "../controllers/comments.controller.js";

const commentRouter = Router({ mergeParams: true });

commentRouter.post("/", postCommentController);

export default commentRouter;
