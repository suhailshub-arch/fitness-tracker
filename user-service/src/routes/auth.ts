import { Router } from "express";
import { registerController } from "../controllers/auth.js";

const authRouter = Router();

authRouter.post("/register", registerController);

export default authRouter;
