import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { EmailNotifier, LogNotifier, Notifier } from './notifier.service';

@Module({
  controllers: [LeadsController],
  providers: [
    LeadsService,
    // Email when SMTP is configured (SMTP_HOST + NOTIFY_TO), otherwise log-only.
    // Bound behind the Notifier token so nothing else in the app cares which.
    {
      provide: Notifier,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Notifier => {
        const smtp = config.get<{ host?: string; to?: string }>('smtp');
        return smtp?.host && smtp?.to ? new EmailNotifier(config) : new LogNotifier();
      },
    },
  ],
})
export class LeadsModule {}
