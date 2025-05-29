import { Router } from "express";
import { loginController, registerController } from "../controllers/auth.js";

const authRouter = Router();

authRouter.post("/register", registerController);
authRouter.post("/login", loginController);

export default authRouter;
