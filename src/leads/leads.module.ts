import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { LogNotifier, Notifier } from './notifier.service';

@Module({
  controllers: [LeadsController],
  providers: [
    LeadsService,
    // Bind the Notifier token to the log-only implementation. To send email later,
    // swap this useClass for an SmtpNotifier / ResendNotifier — nothing else changes.
    { provide: Notifier, useClass: LogNotifier },
  ],
})
export class LeadsModule {}
