import { Injectable, Logger } from '@nestjs/common';

export interface SubmissionNotice {
  kind: 'registration' | 'contact';
  name: string;
  email: string;
  summary: string;
}

/**
 * Notification hook for new submissions.
 *
 * Per the chosen setup (log-only), the default implementation records an audit line —
 * no email is sent, nothing external to configure. Swapping in SMTP/Resend later is a
 * one-file change: implement this interface and bind it in LeadsModule. The rest of the
 * app already depends only on `Notifier`, so no refactor is needed.
 */
export abstract class Notifier {
  abstract notify(notice: SubmissionNotice): Promise<void>;
}

@Injectable()
export class LogNotifier extends Notifier {
  private readonly logger = new Logger('SubmissionNotifier');

  async notify(notice: SubmissionNotice): Promise<void> {
    this.logger.log(
      `New ${notice.kind} submission from ${notice.name} <${notice.email}>: ${notice.summary}`,
    );
  }
}
