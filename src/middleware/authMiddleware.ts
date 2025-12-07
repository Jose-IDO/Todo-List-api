/**
 * JWT authentication middleware
 *
 * Thought process:
 * - This middleware checks for a valid JWT in the Authorization header.
 * - If the token is valid, it attaches the user info to req.user.
 * - If not, it returns 401 Unauthorized.
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend the Express Request type so we can safely attach req.user
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}

// Read JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in environment variables");
}

/**
 * authMiddleware
 *
 * This middleware:
 * 1. Reads the Authorization header.
 * 2. Checks it starts with "Bearer ".
 * 3. Verifies the JWT using the secret.
 * 4. If valid, sets req.user and calls next().
 * 5. If invalid/missing, returns 401 Unauthorized.
 */
export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // 1. Read the Authorization header: e.g. "Bearer <token>"
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // No token or wrong format → not authenticated
    return res.status(401).json({ message: "Authorization token missing or invalid" });
  }

  // 2. Extract the actual token string
  const token = authHeader.split(" ")[1]; // "Bearer <token>" → ["Bearer", "<token>"]

  try {
    // 3. Verify the token and decode the payload
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      email: string;
      iat: number;
      exp: number;
    };

    // 4. Attach user info to the request object
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    // 5. Continue to the next middleware/route handler
    next();
  } catch (error) {
    console.error("Error verifying JWT:", error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
