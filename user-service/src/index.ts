import express, { Request, Response } from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import authRouter from "./routes/auth.js";
import { PORT } from "./config/index.js";

const app = express();
app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.use('/api/auth', authRouter);

// 404 for any routes not handled
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found" });
});

app.use(errorHandler);


app.listen(PORT, () => {
  console.log(`Users service listening on port ${PORT}`);
});

export { app };
