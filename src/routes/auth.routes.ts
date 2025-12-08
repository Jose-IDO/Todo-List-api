/**
 * Auth routes for Register and Login
 *
 * Thought process:
 * - Keep auth logic in its own router for clarity and separation of concerns.
 * - Use Prisma to talk to the database and bcrypt to hash/compare passwords.
 * - Return a JWT token on successful register/login so the client can authenticate
 *   future requests.
 */

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";

const router = Router();

// Small helper for getting JWT secret safely
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // Fail fast if the secret is missing
  throw new Error("JWT_SECRET is not set in environment variables");
}

/**
 * POST /api/v1/auth/register
 *
 * Body: { name, surname, email, password }
 *
 * Flow:
 * 1. Basic validation of input.
 * 2. Check if a user with this email already exists.
 * 3. Hash the password with bcrypt.
 * 4. Save the user in the database.
 * 5. Generate a JWT token and return it with the user data.
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, surname, email, password } = req.body;

    // 1. Basic validation
    if (!name || !surname || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    // 2. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email is already in use" });
    }

    // 3. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    // 10 is the salt rounds – a balance between security and performance.

    // 4. Create the user in the database
    const user = await prisma.user.create({
      data: {
        name,
        surname,
        email,
        password: hashedPassword,
      },
    });

    // 5. Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Never send the password back
    const safeUser = {
      id: user.id,
      name: user.name,
      surname: user.surname,
      email: user.email,
    };

    return res.status(201).json({
      message: "User registered successfully",
      user: safeUser,
      token,
    });
  } catch (error) {
    console.error("Error in /register:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * POST /api/v1/auth/login
 *
 * Body: { email, password }
 *
 * Flow:
 * 1. Basic validation.
 * 2. Find the user by email.
 * 3. Compare the provided password with the hashed password.
 * 4. If valid, generate a JWT token and return it.
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. Basic validation
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // 2. Find the user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.isDeleted) {
      // Either user does not exist, or account was soft-deleted
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 3. Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 4. Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const safeUser = {
      id: user.id,
      name: user.name,
      surname: user.surname,
      email: user.email,
    };

    return res.status(200).json({
      message: "Login successful",
      user: safeUser,
      token,
    });
  } catch (error) {
    console.error("Error in /login:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
