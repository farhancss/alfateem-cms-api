import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { TokenPairDto } from './dto/auth-response.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<TokenPairDto> {
    const user = await this.users.findByEmailWithSecret(email);
    // Constant message + always-run verify avoids leaking which half was wrong and
    // narrows the timing side-channel between "no such user" and "bad password".
    if (!user || !user.active) {
      // Still spend time hashing to blunt user-enumeration timing.
      await argon2.hash(password).catch(() => undefined);
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await UsersService.verifyPassword(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    await this.users.markLogin(user.id);
    return this.issueTokens(user);
  }

  /**
   * Refresh with rotation: the presented refresh token must both verify
   * cryptographically AND match the hash we stored at last issue. A used/rotated or
   * revoked token fails the hash check even if its signature is still valid.
   */
  async refresh(refreshToken: string): Promise<TokenPairDto> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.users.findByIdWithSecret(payload.sub);
    if (!user || !user.active || !user.refreshTokenHash) {
      throw new UnauthorizedException('Session is no longer valid');
    }
    const matches = await argon2.verify(user.refreshTokenHash, refreshToken);
    if (!matches) {
      // Token reuse / theft signal — hard-revoke the session.
      await this.users.setRefreshTokenHash(user.id, null);
      throw new UnauthorizedException('Session is no longer valid');
    }
    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.users.setRefreshTokenHash(userId, null);
  }

  me(user: AuthUser): AuthUser {
    return user;
  }

  // ── internals ────────────────────────────────────────────────────────────────

  private async issueTokens(user: User): Promise<TokenPairDto> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessTtl = this.config.get<number>('jwt.accessTtl')!;
    const refreshTtl = this.config.get<number>('jwt.refreshTtl')!;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: accessTtl,
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: refreshTtl,
      }),
    ]);

    // Store only a hash of the refresh token — DB compromise cannot mint sessions.
    await this.users.setRefreshTokenHash(user.id, await argon2.hash(refreshToken));

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTtl,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }
}
