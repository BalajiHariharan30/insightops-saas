import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('10000'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  REDIS_TOKEN: z.string().min(1, 'REDIS_TOKEN is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  AI_API_KEY: z.string().min(1, 'AI_API_KEY is required'),
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),
  SENTRY_DSN: z.string().url('SENTRY_DSN must be a valid URL').optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('❌ Environment configuration validation failed:', JSON.stringify(result.error.format(), null, 2));
  process.exit(1);
}

export const config = result.data;
