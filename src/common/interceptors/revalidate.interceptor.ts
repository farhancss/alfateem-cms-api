import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { RevalidationService } from '../revalidation.service';

/**
 * After any successful content mutation, ping the frontend to refresh.
 *
 * Fires on POST/PATCH/PUT/DELETE, EXCEPT:
 *  - /auth/*   (login/refresh/logout change no site content)
 *  - /leads/*  (form submissions + status changes don't affect rendered pages)
 *
 * Everything else — courses, posts, events, graduates, pages/sections, settings — is a
 * content change worth reflecting on the site.
 */
@Injectable()
export class RevalidateInterceptor implements NestInterceptor {
  constructor(private readonly revalidation: RevalidationService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method.toUpperCase();
    const isMutation = method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE';
    const path = req.originalUrl || req.url || '';
    const skip = /\/auth(\/|$)/.test(path) || /\/leads(\/|$)/.test(path);

    return next.handle().pipe(
      tap(() => {
        // Only after the handler resolves successfully (errors skip the tap).
        if (isMutation && !skip) this.revalidation.purgeAll();
      }),
    );
  }
}
