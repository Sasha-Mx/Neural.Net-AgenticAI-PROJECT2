import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]),
  BASE_URL: z.string().optional(),
  BASE_URL_OTHER_PORT: z.string().optional(),
  ADMIN_PASSWORD: z.string(),
  JWT_SECRET: z.string(),
  OPENROUTER_API_KEY: z.string(),
  // Open-source image generation API keys
  HUGGINGFACE_API_KEY: z.string().optional(), // For SDXL, SD 2.1, SD 1.5, Kandinsky, Playground
  REPLICATE_API_TOKEN: z.string().optional(), // For FLUX Schnell and other Replicate models
  // Legacy - no longer required but kept for backward compatibility
  OPENAI_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
