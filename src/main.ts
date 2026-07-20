import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';

async function bootstrap() {
  // bodyParser:false → we register our own with an explicit limit below, otherwise
  // Nest's default 100kb parser would 413 large rich-text payloads before our cap.
  const app = await NestFactory.create(AppModule, { bufferLogs: true, bodyParser: false });

  // Structured logging (pino) with per-request ids.
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService);
  const isProd = config.get<boolean>('isProd');
  const corsOrigins = config.get<string[]>('corsOrigins') ?? [];
  const port = config.get<number>('port') ?? 4000;

  // Security headers.
  app.use(helmet());

  // CORS locked to configured frontend origins only.
  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Body parsing with an explicit size limit (defends against oversized payloads).
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // All routes under /api/v1.
  app.setGlobalPrefix('api/v1');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Global validation: strip unknown props, reject extras, transform to DTO types.
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

  // Graceful shutdown → Prisma disconnects, in-flight requests drain.
  app.enableShutdownHooks();

  // Swagger / OpenAPI at /docs.
  if (config.get<boolean>('swaggerEnabled')) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Al-Fateem Academy CMS API')
      .setDescription(
        'Headless CMS for the Al-Fateem Academy website. Content collections, the ' +
          'per-section "folds" page model, and public form submissions. ' +
          'Authenticate via POST /api/v1/auth/login, then use the Bearer token.',
      )
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .addTag('Auth', 'Login, token refresh, logout, current user')
      .addTag('Users', 'User administration (ADMIN only)')
      .addTag('Pages', 'Page + section (folds) content model')
      .addTag('Courses', 'Courses and their lessons')
      .addTag('Posts', 'Blog posts and categories')
      .addTag('Events', 'Events and galleries')
      .addTag('Graduates', 'Graduate wall')
      .addTag('Settings', 'Site settings, navigation, stats')
      .addTag('Leads', 'Registration and contact submissions')
      .addTag('Media', 'Media references')
      .addTag('Health', 'Liveness / readiness')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port);
  const logger = app.get(Logger);
  logger.log(`API listening on ${config.get('appUrl')}/api/v1  (env: ${isProd ? 'prod' : 'dev'})`);
  if (config.get<boolean>('swaggerEnabled')) {
    logger.log(`Swagger docs at ${config.get('appUrl')}/docs`);
  }
}

bootstrap();
