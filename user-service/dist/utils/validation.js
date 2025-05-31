import { BadRequest } from "./ApiError.js";
export function validateEmailPassword(email, password) {
    if (typeof email !== "string" || !email.includes("@")) {
        throw BadRequest("A valid email is required");
    }
    if (typeof password !== "string" || password.length < 6) {
        throw BadRequest("Password must be at least 6 characters");
    }
}
