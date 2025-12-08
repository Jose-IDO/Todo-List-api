import { Router, Response } from "express";
import axios from "axios";
import { AuthenticatedRequest, authMiddleware } from "../middleware/authMiddleware";
import prisma from "../config/prisma";
import { hf } from "../config/huggingface";

const router = Router();
router.use(authMiddleware);

router.post(
  "/categorise-todos",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      const todos = await prisma.todo.findMany({
        where: { userId },
        select: { id: true, title: true, description: true },
      });

      if (todos.length === 0) {
        return res.status(400).json({ message: "No todos to categorise" });
      }

      const results: Array<{
        id: number;
        title: string;
        description: string;
        aiTags: string[];
      }> = [];

      for (const todo of todos) {
        const prompt = `
          Categorise the following todo into 1-3 simple tags.
          Only output a comma-separated list of tags.

          Title: ${todo.title}
          Description: ${todo.description}

          Tags:
        `;

        try {
          const response = await hf.post(
            "/mistralai/Mistral-7B-Instruct-v0.2",
            {
              inputs: prompt,
              parameters: { max_new_tokens: 30 },
            }
          );

          console.log("HF raw response data:", response.data);

          let text: string;

          // HuggingFace text-generation responses are usually arrays
          const data = response.data as any;

          if (Array.isArray(data)) {
            if (typeof data[0] === "string") {
              text = data[0];
            } else if (typeof data[0]?.generated_text === "string") {
              text = data[0].generated_text;
            } else {
              text = "general";
            }
          } else if (typeof data === "string") {
            text = data;
          } else if (typeof data?.generated_text === "string") {
            text = data.generated_text;
          } else {
            text = "general";
          }

          const tags = text
            .replace(prompt, "") // if model echoes prompt
            .split(",")
            .map((t: string) => t.trim().toLowerCase())
            .filter(Boolean);

          results.push({
            id: todo.id,
            title: todo.title,
            description: todo.description,
            aiTags: tags.length ? tags : ["general"],
          });
        } catch (err: any) {
          // Log details from HuggingFace / axios
          if (axios.isAxiosError(err)) {
            console.error("HuggingFace error:", {
              status: err.response?.status,
              data: err.response?.data,
            });
          } else {
            console.error("Unknown AI error:", err);
          }

          // Fallback: still return the todo with empty tags
          results.push({
            id: todo.id,
            title: todo.title,
            description: todo.description,
            aiTags: [],
          });
        }
      }

      return res.json({
        message: "AI categorisation attempted for all todos",
        todos: results,
      });
    } catch (err) {
      console.error("Error in /categorise-todos route:", err);
      return res.status(500).json({ message: "AI categorisation failed" });
    }
  }
);

export default router;
