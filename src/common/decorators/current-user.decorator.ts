import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

/** Shape attached to req.user by JwtStrategy.validate(). */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  name: string;
}

/**
 * Injects the authenticated user (or one property of it) into a handler:
 *   `@CurrentUser() user: AuthUser`  or  `@CurrentUser('id') id: string`
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    return data ? user?.[data] : user;
  },
);
