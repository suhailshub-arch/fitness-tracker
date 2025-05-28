import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/errorHandler.js";
import { Forbidden } from "./utils/ApiError.js";

dotenv.config();

const app = express();
app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
  throw Forbidden('Testing Foridden Error')
});

// 404 for any routes not handled
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found" });
});

app.use(errorHandler);

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Users service listening on port ${PORT}`);
});

export { app };
