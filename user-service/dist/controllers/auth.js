import * as userService from "../services/userService.js";
import { validateEmailPassword } from "../utils/validation.js";
export async function registerController(req, res) {
    const { email, password, name } = req.body;
    validateEmailPassword(email, password);
    const { user, token } = await userService.registerUser(email, password, name);
    res.status(201).json({
        success: true,
        data: { user, token },
    });
}
export async function loginController(req, res) {
    const { email, password } = req.body;
    const { user, token } = await userService.loginUser(email, password);
    res.status(200).json({
        success: true,
        data: { user, token },
    });
}
