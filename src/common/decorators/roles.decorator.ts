import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to the listed roles. Enforced by RolesGuard.
 * e.g. `@Roles(Role.ADMIN)` — only admins; absence of the decorator means any
 * authenticated user (subject to the JwtAuthGuard).
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
