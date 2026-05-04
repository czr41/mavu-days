import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().optional(),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().default(3001),
  JWT_SECRET: z.string().min(32),
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  MOCK_PAYMENTS: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  FEATURE_PHASE2_MESSAGES: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}
