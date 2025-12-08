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

