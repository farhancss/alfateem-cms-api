import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Dashboard aggregates in a single call — collection counts, lead stats, a 30-day
 * registrations time series, and the most recent submissions. Admin-only (guarded by
 * the global JwtAuthGuard; no @Public()). Keeps the admin dashboard to one request
 * instead of six, and gives accurate totals independent of any list page size.
 */
@Injectable()
class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    // 30-day window ending today, computed in UTC so the day-buckets below line up
    // with the UTC dates the leads' createdAt serialize to (the server may run in a
    // non-UTC timezone — e.g. PKT — which otherwise shifts today's rows out of range).
    const DAY = 24 * 60 * 60 * 1000;
    const now = new Date();
    const startUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 29 * DAY;
    const since = new Date(startUTC);

    const [
      courses,
      posts,
      events,
      graduates,
      videos,
      testimonials,
      batches,
      regsTotal,
      regsNew,
      msgsTotal,
      msgsNew,
      recentRegs,
      recentMsgs,
      windowRegs,
    ] = await this.prisma.$transaction([
      this.prisma.course.count(),
      this.prisma.post.count(),
      this.prisma.event.count(),
      this.prisma.graduate.count(),
      this.prisma.video.count(),
      this.prisma.testimonial.count(),
      this.prisma.batch.count(),
      this.prisma.registrationLead.count(),
      this.prisma.registrationLead.count({ where: { status: 'NEW' } }),
      this.prisma.contactMessage.count(),
      this.prisma.contactMessage.count({ where: { status: 'NEW' } }),
      this.prisma.registrationLead.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { id: true, name: true, courseSlug: true, status: true, createdAt: true },
      }),
      this.prisma.contactMessage.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { id: true, name: true, subject: true, status: true, createdAt: true },
      }),
      this.prisma.registrationLead.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
    ]);

    // Bucket registrations into per-day counts across the whole window (zero-filled).
    const days: { date: string; count: number }[] = [];
    const byDay = new Map<string, number>();
    for (const r of windowRegs) {
      const key = r.createdAt.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    for (let i = 0; i < 30; i++) {
      const key = new Date(startUTC + i * DAY).toISOString().slice(0, 10);
      days.push({ date: key, count: byDay.get(key) ?? 0 });
    }

    return {
      counts: { courses, posts, events, graduates, videos, testimonials, batches },
      leads: {
        registrations: { total: regsTotal, new: regsNew },
        messages: { total: msgsTotal, new: msgsNew },
      },
      registrationsByDay: days,
      recentRegistrations: recentRegs,
      recentMessages: recentMsgs,
    };
  }
}

@ApiTags('Stats')
@Controller('stats')
class StatsController {
  constructor(private readonly stats: StatsService) {}

  @ApiBearerAuth('access-token')
  @Get('dashboard')
  @ApiOperation({ summary: 'Admin dashboard aggregates (counts, leads, 30-day series)' })
  dashboard() {
    return this.stats.dashboard();
  }
}

@Module({ controllers: [StatsController], providers: [StatsService] })
export class StatsModule {}
