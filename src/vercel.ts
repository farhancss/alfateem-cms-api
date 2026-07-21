import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import express, { Express, json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';

/**
 * Serverless bootstrap for Vercel. `api/index.js` requires the compiled version of
 * this file from `dist/`. The Nest app is created once per lambda instance and cached
 * across invocations (cold start pays the boot cost; warm requests reuse it).
 *
 * The middleware/config below deliberately MIRRORS main.ts (the long-running server
 * entry used for local dev / Docker / VPS) without touching it — if you change one,
 * change the other.
 *
 * Serverless + MySQL note: keep the connection footprint per instance minimal by
 * appending `?connection_limit=1&pool_timeout=20` to DATABASE_URL.
 */
let cached: Express | null = null;

export async function getServer(): Promise<Express> {
  if (cached) return cached;

  const expressApp = express();
  // bodyParser:false → we register our own with an explicit limit below (same as main.ts).
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    bufferLogs: true,
    bodyParser: false,
  });

  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService);
  const corsOrigins = config.get<string[]>('corsOrigins') ?? [];

  app.use(helmet());
  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new RequestIdInterceptor());

  if (config.get<boolean>('swaggerEnabled')) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Al-Fateem Academy CMS API')
      .setDescription('Headless CMS for the Al-Fateem Academy website.')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.init();
  cached = expressApp;
  return cached;
}
