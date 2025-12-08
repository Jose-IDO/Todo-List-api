/**
 * Main server entry point.
 *
 * Thought process:
 * - Keep this file focused on app setup and routing.
 * - No business logic should live here.
 * - Routes are organized by domain: auth, todos, users.
 * - Middleware like CORS and JSON parser come first.
 */

import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Import route modules
import authRouter from "./routes/auth.routes";
import todoRouter from "./routes/todo.routes";
import userRouter from "./routes/user.routes";

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json()); // Allows Express to parse JSON bodies

/**
 * Health check endpoint si i can verify that the server is running.
 */
app.get("/api/v1/health", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "API is running" });
});

/**
 * Main routes
 * Each domain (auth, todos, users) is separated into its own router file.
 */
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/todos", todoRouter);
app.use("/api/v1/users", userRouter);

// Server port
const PORT = process.env.PORT || 3000;

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
