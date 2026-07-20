import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LeadStatus, MessageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/paginated.dto';
import { Notifier } from './notifier.service';
import {
  CreateContactDto,
  CreateRegistrationDto,
  LeadQueryDto,
  MessageQueryDto,
} from './dto/leads.dto';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifier: Notifier,
  ) {}

  // ── Public writes ────────────────────────────────────────────────────────────

  async submitRegistration(dto: CreateRegistrationDto) {
    if (dto.company) {
      // Honeypot tripped — pretend success, store nothing.
      this.logger.debug('Registration honeypot tripped; discarding');
      return { ok: true };
    }
    const lead = await this.prisma.registrationLead.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        courseSlug: dto.courseSlug,
        message: dto.message,
        source: 'website',
      },
    });
    await this.notifier
      .notify({
        kind: 'registration',
        name: lead.name,
        email: lead.email,
        summary: lead.courseSlug ? `Course: ${lead.courseSlug}` : 'No course selected',
      })
      .catch((e) => this.logger.error('Notifier failed', e));
    return { ok: true, id: lead.id };
  }

  async submitContact(dto: CreateContactDto) {
    if (dto.company) {
      this.logger.debug('Contact honeypot tripped; discarding');
      return { ok: true };
    }
    const msg = await this.prisma.contactMessage.create({
      data: { name: dto.name, email: dto.email, subject: dto.subject, message: dto.message },
    });
    await this.notifier
      .notify({ kind: 'contact', name: msg.name, email: msg.email, summary: msg.subject })
      .catch((e) => this.logger.error('Notifier failed', e));
    return { ok: true, id: msg.id };
  }

  // ── Admin inbox ──────────────────────────────────────────────────────────────

  async listRegistrations(query: LeadQueryDto) {
    const where: Prisma.RegistrationLeadWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [{ name: { contains: query.search } }, { email: { contains: query.search } }];
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.registrationLead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.registrationLead.count({ where }),
    ]);
    return paginate(rows, total, query.page, query.limit);
  }

  async setRegistrationStatus(id: string, status: LeadStatus) {
    const lead = await this.prisma.registrationLead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Registration not found');
    return this.prisma.registrationLead.update({ where: { id }, data: { status } });
  }

  async listMessages(query: MessageQueryDto) {
    const where: Prisma.ContactMessageWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { email: { contains: query.search } },
        { subject: { contains: query.search } },
      ];
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.contactMessage.count({ where }),
    ]);
    return paginate(rows, total, query.page, query.limit);
  }

  async setMessageStatus(id: string, status: MessageStatus) {
    const msg = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!msg) throw new NotFoundException('Message not found');
    return this.prisma.contactMessage.update({ where: { id }, data: { status } });
  }
}
