import { Env, envSchema } from './env.validation';

/**
 * Typed, structured view over the validated env. Registered as the ConfigModule load
 * fn so services can inject `ConfigService` and read `config.get('jwt.accessSecret')`
 * with full typing instead of poking at raw process.env strings.
 *
 * We re-parse process.env through envSchema here (rather than casting it) so numeric
 * and boolean fields are actually COERCED — not left as raw strings. This matters:
 * a raw string TTL like "900" passed to jwt.signAsync's `expiresIn` is read as 900ms
 * (≈0s) instead of 900s, minting already-expired access tokens. The parse is a no-op
 * beyond coercion since validateEnv() already ran the same schema at boot.
 */
export const configuration = () => {
  const e: Env = envSchema.parse(process.env);
  return {
    nodeEnv: e.NODE_ENV,
    isProd: e.NODE_ENV === 'production',
    port: e.PORT,
    appUrl: e.APP_URL,
    swaggerEnabled: e.SWAGGER_ENABLED,
    corsOrigins: String(e.CORS_ORIGINS)
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    jwt: {
      accessSecret: e.JWT_ACCESS_SECRET,
      refreshSecret: e.JWT_REFRESH_SECRET,
      accessTtl: e.JWT_ACCESS_TTL,
      refreshTtl: e.JWT_REFRESH_TTL,
    },
    seedAdmin: {
      email: e.SEED_ADMIN_EMAIL,
      password: e.SEED_ADMIN_PASSWORD,
      name: e.SEED_ADMIN_NAME,
    },
    throttle: {
      ttl: e.THROTTLE_TTL,
      limit: e.THROTTLE_LIMIT,
    },
    revalidate: {
      url: e.FRONTEND_REVALIDATE_URL,
      secret: e.REVALIDATE_SECRET,
    },
    smtp: {
      host: e.SMTP_HOST,
      port: e.SMTP_PORT,
      secure: e.SMTP_SECURE,
      user: e.SMTP_USER,
      pass: e.SMTP_PASS,
      from: e.NOTIFY_FROM,
      to: e.NOTIFY_TO,
    },
  };
};

export type AppConfig = ReturnType<typeof configuration>;
