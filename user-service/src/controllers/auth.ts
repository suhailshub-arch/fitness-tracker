import * as userService from "../services/userService.js";
import { validateEmailPassword } from "../utils/validation.js";
import { Request, Response } from "express";

interface RegisterBody {
  email: string;
  password: string;
  name: string;
}

interface loginBody {
  email: string;
  password: string;
}

export async function registerController(req: Request, res: Response) {
  const { email, password, name } = req.body as RegisterBody;
  validateEmailPassword(email, password);
  const { user, token } = await userService.registerUser(email, password, name);
  console.log("Posted to database");
  res.status(201).json({
    success: true,
    data: { user, token },
  });
}

export async function loginController(req: Request, res: Response) {
  const { email, password } = req.body as loginBody;
  const { user, token } = await userService.loginUser(email, password);
  res.status(200).json({
    success: true,
    data: { user, token },
  });
}
