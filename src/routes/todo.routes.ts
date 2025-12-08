/**
 * Todo routes (CRUD + bulk upload)
 *
 * Thought process:
 * - All todo routes are protected by authMiddleware (per-user isolation).
 * - Each user can only see and modify their own todos.
 * - PATCH is used for partial updates to a todo.
 * - Bulk upload allows users to upload multiple todos at once via JSON or CSV.
 */

import { Router, Response } from "express";
import prisma from "../config/prisma";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../middleware/authMiddleware";
import multer from "multer";
import { parse } from "csv-parse/sync";

const router = Router();

/**
 * Apply authMiddleware to all routes in this router.
 * That means every /todos endpoint requires a valid JWT.
 */
router.use(authMiddleware);

/**
 * Configure multer to store uploaded files in memory.
 *
 * Thought process:
 * - We don't need to save files to disk for this challenge.
 * - We only need the file contents to parse JSON/CSV and insert into the DB.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max file size (just a safety limit)
  },
});

/**
 * Helper type for raw todo input from JSON or CSV.
 */
type RawTodoInput = {
  title?: string;
  description?: string;
  status?: string;
};

/**
 * Normalize JSON input into an array of RawTodoInput.
 *
 * Supported JSON formats:
 * 1) An array of todos:
 *    [
 *      { "title": "...", "description": "...", "status": "PENDING" },
 *      { "title": "...", "description": "..." }
 *    ]
 *
 * 2) An object with a "todos" array:
 *    {
 *      "todos": [
 *        { "title": "...", "description": "..." }
 *      ]
 *    }
 */
function normalizeJsonTodos(jsonData: unknown): RawTodoInput[] {
  if (Array.isArray(jsonData)) {
    return jsonData as RawTodoInput[];
  }

  if (
    typeof jsonData === "object" &&
    jsonData !== null &&
    Array.isArray((jsonData as any).todos)
  ) {
    return (jsonData as any).todos as RawTodoInput[];
  }

  return [];
}

/**
 * Parse CSV buffer into an array of RawTodoInput.
 *
 * Expected CSV headers: title,description,status
 *
 * Example:
 * title,description,status
 * "Finish LuckyBeard task","Work on bulk upload feature","PENDING"
 * "Study Prisma","Prepare for interview","DONE"
 */
function parseCsvTodos(buffer: Buffer): RawTodoInput[] {
  const content = buffer.toString("utf-8");

  const records = parse(content, {
    columns: true, // Use the first row as column names
    skip_empty_lines: true,
    trim: true,
  }) as RawTodoInput[];

  return records;
}

/**
 * POST /api/v1/todos/upload
 *
 * Bulk upload todos from a JSON or CSV file.
 *
 * - Uses multer to handle the file upload (field name: "file").
 * - Detects format based on file extension (.json or .csv).
 * - Validates each row (requires title and description).
 * - Inserts valid todos using Prisma createMany.
 * - All todos are created for the authenticated user (per-user isolation).
 */
router.post(
  "/upload",
  upload.single("file"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Multer puts the uploaded file on req.file
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.user.userId;
      const originalName = req.file.originalname.toLowerCase();
      const buffer = req.file.buffer;

      let rawTodos: RawTodoInput[] = [];

      if (originalName.endsWith(".json")) {
        // Handle JSON file
        try {
          const parsed = JSON.parse(buffer.toString("utf-8"));
          rawTodos = normalizeJsonTodos(parsed);
        } catch (err) {
          return res.status(400).json({ message: "Invalid JSON file" });
        }
      } else if (originalName.endsWith(".csv")) {
        // Handle CSV file
        try {
          rawTodos = parseCsvTodos(buffer);
        } catch (err) {
          console.error("Error parsing CSV:", err);
          return res.status(400).json({ message: "Invalid CSV file" });
        }
      } else {
        return res
          .status(400)
          .json({ message: "Unsupported file type. Use .json or .csv" });
      }

      if (rawTodos.length === 0) {
        return res.status(400).json({ message: "No todos found in file" });
      }

      // Filter and map to valid todos
      const validTodos = rawTodos
        .filter((t) => t.title && t.description) // require title + description
        .map((t) => ({
          title: t.title as string,
          description: t.description as string,
          status: t.status || "PENDING",
          userId,
        }));

      const total = rawTodos.length;
      const toInsert = validTodos.length;
      const skipped = total - toInsert;

      if (toInsert === 0) {
        return res.status(400).json({
          message:
            "No valid todos to insert. Make sure each row has a title and description.",
          totalRows: total,
          inserted: 0,
          skipped,
        });
      }

      // Insert all valid todos at once
      const result = await prisma.todo.createMany({
        data: validTodos,
      });

      return res.status(201).json({
        message: "Bulk upload completed",
        totalRows: total,
        attemptedInsert: toInsert,
        inserted: result.count,
        skipped,
      });
    } catch (error) {
      console.error("Error in bulk upload:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

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
 * PATCH /api/v1/todos/:id
 *
 * Partially update a todo (title, description, status) for the authenticated user.
 *
 * Body can include any of: { title?: string, description?: string, status?: string }
 */
router.patch("/:id", async (req: AuthenticatedRequest, res: Response) => {
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
