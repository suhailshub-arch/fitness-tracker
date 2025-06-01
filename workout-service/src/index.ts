import express, { Request, Response } from "express";
import { PORT } from "./config/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { NotFound } from "./utils/ApiError.js";
import prisma from "./prismaClient.js";
import { authJWTMiddleware } from "./middleware/auth.middleware.js";

const app = express();
app.use(express.json());

// Health check (public)
app.get("/healthz", async (req: Request, res: Response) => {
  // try {
  //   await prisma.$queryRaw`SELECT 1`; // test DB connectivity
  //   res.status(200).json({ status: "ok", db: "reachable" });
  // } catch (err) {
  //   res.status(500).json({ status: "error", db: "unreachable" });
  // }
  res.status(200).json({ status: "ok" });
});

app.use(authJWTMiddleware);

app.get("/protected", (req: Request, res: Response) => {
  res.status(200).json({ status: "protected" });
});

app.use((req: Request, res: Response) => {
  throw NotFound("Page not found");
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Workout service listening on port ${PORT}`);
});

export default app;
