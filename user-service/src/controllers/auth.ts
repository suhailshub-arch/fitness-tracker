import * as userService from "../services/userService.js";
import { validateEmailPassword } from "../utils/validation.js";
import { Request, Response } from "express";

interface RegisterBody {
  email: string;
  password: string;
  name: string;
}

export async function registerController(req: Request, res: Response) {
  const { email, password, name } = req.body as RegisterBody;
  validateEmailPassword(email, password);
  const { user, token } = await userService.registerUser(email, password, name);
  res.status(201).json({
    success: true,
    data: { user, token },
  });
}
