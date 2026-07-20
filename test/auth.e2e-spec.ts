import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Critical-path e2e: auth happy path + auth-failure paths + RBAC + a public content
 * route. Requires a reachable test database (set DATABASE_URL to a disposable schema
 * and run `npm run db:migrate:dev && npm run db:seed` first). See README › Testing.
 */
describe('Auth & RBAC (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const base = '/api/v1';
  const admin = {
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@alfateemacademy.com',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe_Strong_Passw0rd!',
  };

  it('rejects login with wrong password (401)', () => {
    return request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send({ email: admin.email, password: 'wrong-password-xyz' })
      .expect(401);
  });

  it('rejects a malformed body (400, validation)', () => {
    return request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send({ email: 'not-an-email', password: 'x' })
      .expect(400);
  });

  it('serves a public content route without a token', () => {
    return request(app.getHttpServer()).get(`${base}/courses`).expect(200);
  });

  it('blocks a protected route without a token (401)', () => {
    return request(app.getHttpServer()).get(`${base}/users`).expect(401);
  });

  describe('with a valid admin session', () => {
    let accessToken: string;
    let refreshToken: string;

    it('logs in and returns a token pair', async () => {
      const res = await request(app.getHttpServer())
        .post(`${base}/auth/login`)
        .send(admin)
        .expect(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.role).toBe('ADMIN');
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('allows an ADMIN to list users', () => {
      return request(app.getHttpServer())
        .get(`${base}/users`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('rotates the refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post(`${base}/auth/refresh`)
        .send({ refreshToken })
        .expect(200);
      expect(res.body.accessToken).toBeDefined();
      // Old refresh token must now be rejected (rotation).
      await request(app.getHttpServer())
        .post(`${base}/auth/refresh`)
        .send({ refreshToken })
        .expect(401);
    });
  });
});
