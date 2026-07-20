import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as reachable without authentication. The global JwtAuthGuard checks
 * for this key and lets the request through. Everything is protected by default;
 * public access is opt-in and explicit.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
