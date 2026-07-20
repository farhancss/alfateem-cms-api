import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';

import { configuration } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { RevalidationService } from './common/revalidation.service';
import { RevalidateInterceptor } from './common/interceptors/revalidate.interceptor';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PagesModule } from './pages/pages.module';
import { CoursesModule } from './courses/courses.module';
import { PostsModule } from './posts/posts.module';
import { EventsModule } from './events/events.module';
import { GraduatesModule } from './graduates/graduates.module';
import { TestimonialsModule } from './testimonials/testimonials.module';
import { SettingsModule } from './settings/settings.module';
import { MediaModule } from './media/media.module';
import { LeadsModule } from './leads/leads.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Config: validate env, then expose the structured `configuration()` view.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      load: [configuration],
    }),

    // Structured logging with per-request ids. Secrets are redacted so tokens and
    // passwords never reach the logs.
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          genReqId: (req) => (req.headers['x-request-id'] as string) ?? randomUUID(),
          level: config.get('isProd') ? 'info' : 'debug',
          transport: config.get('isProd')
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.password',
              'req.body.refreshToken',
              'res.headers["set-cookie"]',
            ],
            remove: true,
          },
          autoLogging: true,
        },
      }),
    }),

    // Global rate limiting (auth + public forms tighten this further per-route).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: (config.get<number>('throttle.ttl') ?? 60) * 1000,
            limit: config.get<number>('throttle.limit') ?? 120,
          },
        ],
      }),
    }),

    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    PagesModule,
    CoursesModule,
    PostsModule,
    EventsModule,
    GraduatesModule,
    TestimonialsModule,
    SettingsModule,
    MediaModule,
    LeadsModule,
    HealthModule,
  ],
  providers: [
    // Order matters: rate-limit → authenticate → authorize.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // After a successful content mutation, tell the frontend to refresh (fire-and-forget).
    RevalidationService,
    { provide: APP_INTERCEPTOR, useClass: RevalidateInterceptor },
  ],
})
export class AppModule {}
