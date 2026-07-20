import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Notifies the Next.js frontend to purge its ISR cache when content changes, so admin
 * edits appear on the site within a second instead of waiting out the revalidate
 * window. Fire-and-forget: a slow or down frontend must never block an API response.
 *
 * Configured via FRONTEND_REVALIDATE_URL + REVALIDATE_SECRET (must match the value the
 * frontend expects). If either is unset, this no-ops with a debug log — the site still
 * updates on its normal ISR schedule.
 */
@Injectable()
export class RevalidationService {
  private readonly logger = new Logger(RevalidationService.name);

  constructor(private readonly config: ConfigService) {}

  purgeAll(): void {
    const url = this.config.get<string>('revalidate.url');
    const secret = this.config.get<string>('revalidate.secret');
    if (!url || !secret) {
      this.logger.debug('Revalidation not configured (FRONTEND_REVALIDATE_URL / REVALIDATE_SECRET); skipping');
      return;
    }

    // Fire-and-forget. `all: true` tells the frontend to revalidate the whole tree.
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ all: true }),
    })
      .then((res) => {
        if (!res.ok) this.logger.warn(`Revalidation webhook returned ${res.status}`);
      })
      .catch((e) => this.logger.warn(`Revalidation webhook failed: ${(e as Error).message}`));
  }
}
