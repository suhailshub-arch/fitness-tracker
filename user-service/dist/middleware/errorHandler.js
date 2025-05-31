import { ApiError } from "../utils/ApiError.js";
export const errorHandler = (err, _req, res, _next) => {
    if (err instanceof ApiError) {
        const { statusCode, message, details } = err;
        res.status(statusCode).json({
            error: message,
            ...(details && { details }),
        });
        return;
    }
    res.status(500).json({ error: "Internal Server Error" });
};
