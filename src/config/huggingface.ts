// src/config/huggingface.ts

/**
 * HuggingFace HTTP client
 *
 * Thought process:
 * - Centralise HuggingFace config in one place.
 * - Read the API key from environment variables.
 * - Use the new router endpoint instead of the deprecated api-inference URL.
 */

import axios from "axios";

const HF_API_KEY = process.env.HF_API_KEY;

if (!HF_API_KEY) {
  throw new Error("HF_API_KEY is missing in environment variables");
}

export const hf = axios.create({
  baseURL: "https://router.huggingface.co",
  headers: {
    Authorization: `Bearer ${HF_API_KEY}`,
  },
});
