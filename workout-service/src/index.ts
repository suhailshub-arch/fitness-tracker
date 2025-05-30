import express, { Request, Response } from "express";
import { PORT } from "./config/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { NotFound } from "./utils/ApiError.js";

const app = express();
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
  });
});

app.use((req: Request, res: Response) => {
  throw NotFound("Page not found");
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Workout service listening on port ${PORT}`);
});

export default app;
