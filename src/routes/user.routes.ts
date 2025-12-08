/**
 * User routes
 *
 * Thought process:
 * - Keep user-account related endpoints separate from auth and todos.
 * - This file currently focuses on the "delete my account" feature.
 * - im implementing soft delete by setting isDeleted = true.
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
 * 3. Optionally, we could act on their todos (e.g. mark them as cancelled),
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

    // Update the user to set isDeleted = true
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isDeleted: true,
      },
    });


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
