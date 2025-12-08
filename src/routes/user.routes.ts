/**
 * User routes
 *
 * Thought process:
 * - Keep user-account related endpoints separate from auth and todos.
 * - This file currently focuses on the "delete my account" feature.
 * - I'm implementing soft delete by setting isDeleted = true.
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
 * Only authenticated users can access these endpoints.
 */
router.use(authMiddleware);

/**
 * DELETE /api/v1/users/me
 *
 * Soft-delete the authenticated user's account.
 *
 * Flow:
 * 1. Ensure user is authenticated (authMiddleware).
 * 2. Mark the user as isDeleted = true.
 * 3. Optionally, we could also mark this user's todos as unavailable.
 * 4. Return a success message.
 */
router.delete("/me", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      // This should not happen if authMiddleware is working,
      // but we keep the check for safety.
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.user.userId;

    // 1) Soft delete the user by setting isDeleted = true
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isDeleted: true,
      },
    });

    /**
     * 2) OPTIONAL: Update this user's todos to reflect that they are now unavailable.
     *
     * Thought process:
     * - When a user deletes their account, one possible business rule is that
     *   their todos should no longer be treated as active work items.
     * - A simple way to represent this in the data is to set their status to
     *   something like "UNAVAILABLE".
     *
     * Using updateMany:
     * - updateMany works well when we want to set the same value for all matching rows.
     * - In this example, we'd be saying:
     *   "All todos for this user are now unavailable."
     *
     * If the business later wanted more detailed messaging like:
     *   "Todo number (id) for user (userId) is unavailable",
     *   we could loop over the todos individually and update the description per row.
     *
     * For now, this is left commented out as an example of how the system
     * could evolve, without changing behaviour for the current brief.
     */

    // await prisma.todo.updateMany({
    //   where: { userId },
    //   data: {
    //     status: "UNAVAILABLE", // meaning: todos for this user are no longer active
    //   },
    // });

    return res.status(200).json({
      message: "Account deleted (soft delete) successfully",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        isDeleted: updatedUser.isDeleted,
      },
    });
  } catch (error) {
    console.error("Error soft-deleting user:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
