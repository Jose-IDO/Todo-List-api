/**
 * Todo routes (CRUD)
 *
 * Thought process:
 * - All todo routes should be protected: only authenticated users can access them.
 * - Each user can ONLY see and modify their own todos.
 * - We use Prisma to query the Todo model and always filter by userId.
 */

import { Router, Response } from "express";
import prisma from "../config/prisma";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../middleware/authMiddleware";

const router = Router();

/**
 * Apply authMiddleware to all routes in this router.
 * That means every /todos endpoint requires a valid JWT.
 */
router.use(authMiddleware);

/**
 * POST /api/v1/todos
 *
 * Create a new todo for the authenticated user.
 *
 * Body: { title: string, description: string, status?: string }
 */
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, status } = req.body;

    // req.user is set by authMiddleware
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Basic validation
    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Title and description are required" });
    }

    const newTodo = await prisma.todo.create({
      data: {
        title,
        description,
        status: status || "PENDING",
        userId: req.user.userId,
      },
    });

    return res.status(201).json({
      message: "Todo created successfully",
      todo: newTodo,
    });
  } catch (error) {
    console.error("Error creating todo:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /api/v1/todos
 *
 * Get all todos for the authenticated user.
 */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const todos = await prisma.todo.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      message: "Todos fetched successfully",
      todos,
    });
  } catch (error) {
    console.error("Error fetching todos:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /api/v1/todos/:id
 *
 * Get a single todo by id for the authenticated user.
 */
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const todoId = Number(req.params.id);
    if (isNaN(todoId)) {
      return res.status(400).json({ message: "Todo id must be a number" });
    }

    const todo = await prisma.todo.findFirst({
      where: {
        id: todoId,
        userId: req.user.userId,
      },
    });

    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    return res.status(200).json({
      message: "Todo fetched successfully",
      todo,
    });
  } catch (error) {
    console.error("Error fetching todo:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * PUT /api/v1/todos/:id
 *
 * Update a todo (title, description, status) for the authenticated user.
 *
 * Body can include any of: { title?: string, description?: string, status?: string }
 */
router.put("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const todoId = Number(req.params.id);
    if (isNaN(todoId)) {
      return res.status(400).json({ message: "Todo id must be a number" });
    }

    const { title, description, status } = req.body;

    // Check if todo exists and belongs to this user
    const existingTodo = await prisma.todo.findFirst({
      where: {
        id: todoId,
        userId: req.user.userId,
      },
    });

    if (!existingTodo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    const updatedTodo = await prisma.todo.update({
      where: { id: todoId },
      data: {
        title: title ?? existingTodo.title,
        description: description ?? existingTodo.description,
        status: status ?? existingTodo.status,
      },
    });

    return res.status(200).json({
      message: "Todo updated successfully",
      todo: updatedTodo,
    });
  } catch (error) {
    console.error("Error updating todo:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * DELETE /api/v1/todos/:id
 *
 * Delete a todo for the authenticated user.
 * For now this performs a hard delete.
 */
router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const todoId = Number(req.params.id);
    if (isNaN(todoId)) {
      return res.status(400).json({ message: "Todo id must be a number" });
    }

    // Use deleteMany with userId to enforce user isolation
    const result = await prisma.todo.deleteMany({
      where: {
        id: todoId,
        userId: req.user.userId,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ message: "Todo not found" });
    }

    return res.status(200).json({
      message: "Todo deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting todo:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
