/**
 * Main server entry point.
 *
 * Thought process:
 * - Keep this file focused on app setup and wiring, not business logic.
 */

import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./config/prisma";
import authRouter from "./routes/auth.routes";
import { authMiddleware, AuthenticatedRequest } from "./middleware/authMiddleware";




dotenv.config();

const app: Application = express();

app.use(cors());
app.use(express.json());

// Register auth routes under /api/v1/auth
app.use("/api/v1/auth", authRouter);

app.get("/api/v1/health", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "API is running" });
});

app.get("/api/v1/me", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  // req.user is set by the authMiddleware
  if (!req.user) {
    // This should not happen if middleware works, but it's a safety check
    return res.status(500).json({ message: "User info missing on request" });
  }

  return res.json({
    message: "Authenticated user info",
    user: req.user,
  });
});


app.get("/api/v1/db-check", async (req: Request, res: Response) => {
  try {
    // Simple query: how many users exist, helps me confirm the db api communication is working well. verifies prisma config and migrations are wired correctly
    const userCount = await prisma.user.count();

    res.json({
      ok: true,
      message: "Database connection successful",
      userCount,
    });
  } catch (error) {
    console.error("DB check failed:", error);
    res.status(500).json({
      ok: false,
      message: "Database connection failed",
    });
  }
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
