import { z } from 'zod';

/**
 * Environment schema. The app validates process.env against this at boot and fails
 * fast (with a readable list of problems) if anything required is missing or malformed
 * — no half-configured server ever starts. See §9 "Config validated at boot".
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.string().url().default('http://localhost:4000'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(1209600),

  SEED_ADMIN_EMAIL: z.string().email().default('admin@alfateemacademy.com'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('ChangeMe_Strong_Passw0rd!'),
  SEED_ADMIN_NAME: z.string().default('Site Administrator'),

  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),

  THROTTLE_TTL: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),

  FRONTEND_REVALIDATE_URL: z.string().url().optional(),
  REVALIDATE_SECRET: z.string().optional(),

  // Lead email notifications (optional). When SMTP_HOST and NOTIFY_TO are both set,
  // new registrations/contact messages are emailed; otherwise they are only logged.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((x) => x === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  NOTIFY_FROM: z.string().default('Al-Fateem Academy <no-reply@alfateemacademy.com>'),
  NOTIFY_TO: z.string().optional(),

  SWAGGER_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Passed to ConfigModule.forRoot({ validate }). Throwing here aborts bootstrap.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
