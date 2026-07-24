import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

export interface SubmissionNotice {
  kind: 'registration' | 'contact';
  name: string;
  email: string;
  summary: string;
  /** Extra key/value rows rendered in the notification (phone, course, attribution…). */
  details?: Record<string, string>;
}

/**
 * Notification hook for new submissions.
 *
 * Two implementations: `EmailNotifier` (SMTP via nodemailer) when SMTP_HOST and
 * NOTIFY_TO are configured, otherwise `LogNotifier` (audit line only). LeadsModule
 * picks one at boot via a factory — the rest of the app depends only on `Notifier`.
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

/**
 * SMTP notifier. Fire-and-forget from the caller's perspective (LeadsService already
 * .catch()es) — a mail failure must never fail the visitor's submission.
 */
@Injectable()
export class EmailNotifier extends Notifier {
  private readonly logger = new Logger('SubmissionNotifier');
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly to: string;
  private readonly inboxUrl: string | undefined;

  constructor(config: ConfigService) {
    super();
    const smtp = config.get<{
      host: string;
      port: number;
      secure: boolean;
      user?: string;
      pass?: string;
      from: string;
      to: string;
    }>('smtp')!;
    this.transporter = createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    });
    this.from = smtp.from;
    this.to = smtp.to;
    // The admin inbox lives on the public site app — first CORS origin.
    const origins = config.get<string[]>('corsOrigins') ?? [];
    this.inboxUrl = origins[0] ? `${origins[0]}/academy-admin/inbox` : undefined;
  }

  async notify(notice: SubmissionNotice): Promise<void> {
    const label = notice.kind === 'registration' ? 'course registration' : 'contact message';
    const rows: [string, string][] = [
      ['Name', notice.name],
      ['Email', notice.email],
      ...Object.entries(notice.details ?? {}),
    ];

    const text = [
      `New ${label} on the Al-Fateem Academy website.`,
      '',
      ...rows.map(([k, v]) => `${k}: ${v}`),
      '',
      this.inboxUrl ? `Open the inbox: ${this.inboxUrl}` : '',
    ].join('\n');

    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px">
        <h2 style="margin:0 0 4px">New ${esc(label)}</h2>
        <p style="margin:0 0 16px;color:#666">Al-Fateem Academy website</p>
        <table style="border-collapse:collapse;width:100%">
          ${rows
            .map(
              ([k, v]) => `
            <tr>
              <td style="padding:6px 12px 6px 0;color:#666;vertical-align:top;white-space:nowrap">${esc(k)}</td>
              <td style="padding:6px 0">${esc(v)}</td>
            </tr>`,
            )
            .join('')}
        </table>
        ${
          this.inboxUrl
            ? `<p style="margin-top:20px"><a href="${this.inboxUrl}" style="background:#C81119;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600">Open the inbox</a></p>`
            : ''
        }
      </div>`;

    await this.transporter.sendMail({
      from: this.from,
      to: this.to,
      replyTo: `${notice.name} <${notice.email}>`,
      subject: `[AFA] New ${label}: ${notice.name} — ${notice.summary}`,
      text,
      html,
    });
    this.logger.log(`Emailed ${this.to} about ${notice.kind} from ${notice.email}`);
  }
}
