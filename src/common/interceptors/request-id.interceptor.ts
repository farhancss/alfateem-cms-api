import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';

/**
 * Echoes the per-request correlation id (set by nestjs-pino) back to the client as
 * `X-Request-Id`. Support can then match a user-reported error to the exact server
 * log line. Bodies are left untouched — single resources return bare, lists use the
 * `{ data, meta }` envelope from paginate().
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { id?: string }>();
    const res = http.getResponse<Response>();
    if (req.id) res.setHeader('X-Request-Id', String(req.id));
    return next.handle();
  }
}
