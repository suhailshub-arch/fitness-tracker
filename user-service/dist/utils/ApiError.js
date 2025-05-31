export class ApiError extends Error {
    constructor(statusCode, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
// =====================
// 4xx Client Errors
// =====================
/**
 * 400 Bad Request
 * Use when the client sends invalid data or missing required fields.
 */
export const BadRequest = (msg = "Bad Request", details) => new ApiError(400, msg, details);
/**
 * 401 Unauthorized
 * Use when authentication is required or has failed (e.g., missing/invalid token).
 */
export const Unauthorized = (msg = "Unauthorized") => new ApiError(401, msg);
/**
 * 403 Forbidden
 * Use when the user is authenticated but does not have permission to access the resource.
 */
export const Forbidden = (msg = "Forbidden") => new ApiError(403, msg);
/**
 * 404 Not Found
 * Use when the requested resource does not exist.
 */
export const NotFound = (msg = "Not Found") => new ApiError(404, msg);
/**
 * 409 Conflict
 * Use when there is a conflict with the current state of the resource (e.g., duplicate entries).
 */
export const Conflict = (msg = "Conflict") => new ApiError(409, msg);
/**
 * 422 Unprocessable Entity
 * Use when the request is well-formed but contains semantic errors (e.g., validation failures).
 */
export const UnprocessableEntity = (msg = "Unprocessable Entity", details) => new ApiError(422, msg, details);
/**
 * 429 Too Many Requests
 * Use when the user has sent too many requests in a given amount of time (rate limiting).
 */
export const TooManyRequests = (msg = "Too Many Requests") => new ApiError(429, msg);
// =====================
// 5xx Server Errors
// =====================
/**
 * 500 Internal Server Error
 * Use for unexpected errors on the server side.
 */
export const InternalServerError = (msg = "Internal Server Error") => new ApiError(500, msg);
