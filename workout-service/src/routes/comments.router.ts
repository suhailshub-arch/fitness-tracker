import { Router } from "express";

const commentRouter = Router({ mergeParams: true });

commentRouter.post("/", () => {});

export default commentRouter;
