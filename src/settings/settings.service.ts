import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ZodError, z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';

export const SETTINGS_ID = 'singleton';

// Structured sub-objects validated on write (stored as JSON columns).
const contactSchema = z.object({
  email: z.string().email(),
  phones: z.array(z.string().min(3)).min(1),
  address: z.object({
    street: z.string(),
    city: z.string(),
    region: z.string(),
    country: z.string(),
  }),
});
const socialSchema = z.object({
  facebook: z.string().url().optional(),
  twitter: z.string().url().optional(),
  youtube: z.string().url().optional(),
  linkedin: z.string().url().optional(),
});
const mediaSchema = z.record(z.string());

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Bundled read for the frontend: settings + nav + stats in one call. */
  async getBundle() {
    const [settings, nav, stats] = await this.prisma.$transaction([
      this.prisma.siteSetting.findUnique({ where: { id: SETTINGS_ID } }),
      this.prisma.navItem.findMany({ orderBy: { order: 'asc' } }),
      this.prisma.stat.findMany({ orderBy: { order: 'asc' } }),
    ]);
    return { settings, nav, stats };
  }

  getSettings() {
    return this.prisma.siteSetting.findUnique({ where: { id: SETTINGS_ID } });
  }

  async updateSettings(dto: Record<string, unknown>) {
    // Validate the structured sub-objects if present.
    const data: Prisma.SiteSettingUpdateInput = {};
    const scalarKeys = [
      'name',
      'legalName',
      'tagline',
      'url',
      'founded',
      'description',
      'twitterHandle',
    ] as const;
    for (const k of scalarKeys) if (typeof dto[k] === 'string') (data as any)[k] = dto[k];

    try {
      if (dto.contact !== undefined) data.contact = contactSchema.parse(dto.contact);
      if (dto.social !== undefined) data.social = socialSchema.parse(dto.social);
      if (dto.media !== undefined) data.media = mediaSchema.parse(dto.media);
    } catch (e) {
      if (e instanceof ZodError) {
        throw new BadRequestException({
          message: 'Invalid settings payload',
          issues: e.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        });
      }
      throw e;
    }

    // Upsert so the singleton is created if it does not exist yet.
    return this.prisma.siteSetting.upsert({
      where: { id: SETTINGS_ID },
      update: data,
      create: {
        id: SETTINGS_ID,
        name: (dto.name as string) ?? 'Al-Fateem Academy',
        legalName: (dto.legalName as string) ?? 'Al-Fateem Academy',
        tagline: (dto.tagline as string) ?? '',
        url: (dto.url as string) ?? '',
        founded: (dto.founded as string) ?? '',
        description: (dto.description as string) ?? '',
        twitterHandle: (dto.twitterHandle as string) ?? '',
        contact: (data.contact as Prisma.InputJsonValue) ?? {},
        social: (data.social as Prisma.InputJsonValue) ?? {},
        media: (data.media as Prisma.InputJsonValue) ?? {},
      },
    });
  }

  // ── Nav ──────────────────────────────────────────────────────────────────────
  listNav() {
    return this.prisma.navItem.findMany({ orderBy: { order: 'asc' } });
  }
  createNav(data: { label: string; href: string; hasMegaMenu?: boolean; order?: number }) {
    return this.prisma.navItem.create({ data });
  }
  updateNav(id: string, data: Partial<{ label: string; href: string; hasMegaMenu: boolean; order: number }>) {
    return this.prisma.navItem.update({ where: { id }, data });
  }
  deleteNav(id: string) {
    return this.prisma.navItem.delete({ where: { id } });
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  listStats() {
    return this.prisma.stat.findMany({ orderBy: { order: 'asc' } });
  }
  createStat(data: { value: number; suffix?: string; label: string; order?: number }) {
    return this.prisma.stat.create({ data });
  }
  updateStat(id: string, data: Partial<{ value: number; suffix: string; label: string; order: number }>) {
    return this.prisma.stat.update({ where: { id }, data });
  }
  deleteStat(id: string) {
    return this.prisma.stat.delete({ where: { id } });
  }
}
