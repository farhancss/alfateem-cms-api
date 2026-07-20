import { Env } from './env.validation';

/**
 * Typed, structured view over the validated env. Registered as the ConfigModule load
 * fn so services can inject `ConfigService` and read `config.get('jwt.accessSecret')`
 * with full typing instead of poking at raw process.env strings.
 */
export const configuration = (env: NodeJS.ProcessEnv) => {
  // env is already validated by validateEnv() before this runs.
  const e = env as unknown as Env;
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
  };
};

export type AppConfig = ReturnType<typeof configuration>;
