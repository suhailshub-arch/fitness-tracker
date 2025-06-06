import express, { Request, Response } from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import authRouter from "./routes/auth.js";
import { PORT } from "./config/index.js";
import prisma from "./prismaClient.js";

const app = express();
app.use(express.json());

// Health check (public)
app.get("/healthz", async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`; // test DB connectivity
    res.status(200).json({ status: "ok", db: "reachable" });
  } catch (err) {
    res.status(500).json({ status: "error", db: "unreachable" });
  }
});

app.use('/api/auth', authRouter);

// 404 for any routes not handled
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found" });
});

app.use(errorHandler);


app.listen(PORT, () => {
  console.log(`User service listening on port ${PORT}`);
});

export { app };
