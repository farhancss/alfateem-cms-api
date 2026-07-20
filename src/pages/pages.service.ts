import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SectionType } from '@prisma/client';
import { ZodError } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePageDto,
  CreateSectionDto,
  ReorderSectionsDto,
  UpdatePageDto,
  UpdateSectionDto,
} from './dto/page.dto';
import { SECTION_REGISTRY, validateSectionData } from './section-registry';

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  private validate(type: SectionType, data: unknown): Prisma.InputJsonValue {
    try {
      return validateSectionData(type, data) as Prisma.InputJsonValue;
    } catch (e) {
      if (e instanceof ZodError) {
        throw new BadRequestException({
          message: 'Invalid section payload for type ' + type,
          issues: e.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        });
      }
      throw e;
    }
  }

  // ── Admin CRUD ───────────────────────────────────────────────────────────────

  listPages() {
    return this.prisma.page.findMany({
      orderBy: { key: 'asc' },
      include: { _count: { select: { sections: true } } },
    });
  }

  async getPageForAdmin(key: string) {
    const page = await this.prisma.page.findUnique({
      where: { key },
      include: { sections: { orderBy: { order: 'asc' } } },
    });
    if (!page) throw new NotFoundException(`Page "${key}" not found`);
    return page;
  }

  createPage(dto: CreatePageDto) {
    return this.prisma.page.create({ data: dto });
  }

  async updatePage(key: string, dto: UpdatePageDto) {
    await this.getPageForAdmin(key);
    return this.prisma.page.update({ where: { key }, data: dto });
  }

  async deletePage(key: string) {
    await this.getPageForAdmin(key);
    await this.prisma.page.delete({ where: { key } }); // cascades sections
  }

  // ── Section (fold) CRUD ──────────────────────────────────────────────────────

  async addSection(key: string, dto: CreateSectionDto) {
    const page = await this.getPageForAdmin(key);
    const data = this.validate(dto.type, dto.data);
    return this.prisma.section.create({
      data: {
        pageId: page.id,
        type: dto.type,
        order: dto.order ?? page.sections.length,
        enabled: dto.enabled ?? true,
        data,
      },
    });
  }

  async updateSection(sectionId: string, dto: UpdateSectionDto) {
    const section = await this.prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundException('Section not found');

    const patch: Prisma.SectionUpdateInput = {
      order: dto.order,
      enabled: dto.enabled,
    };
    if (dto.data !== undefined) patch.data = this.validate(section.type, dto.data);
    return this.prisma.section.update({ where: { id: sectionId }, data: patch });
  }

  async deleteSection(sectionId: string) {
    const section = await this.prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundException('Section not found');
    await this.prisma.section.delete({ where: { id: sectionId } });
  }

  async reorder(key: string, dto: ReorderSectionsDto) {
    const page = await this.getPageForAdmin(key);
    const owned = new Set(page.sections.map((s) => s.id));
    for (const item of dto.items) {
      if (!owned.has(item.id)) {
        throw new BadRequestException(`Section ${item.id} does not belong to page "${key}"`);
      }
    }
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.section.update({ where: { id: item.id }, data: { order: item.order } }),
      ),
    );
    return this.getPageForAdmin(key);
  }

  // ── Public, fully-resolved read ──────────────────────────────────────────────

  /**
   * Returns the page with its enabled sections in order, and every reference-type
   * section (coursesGrid, graduatesWall, blogPreview) resolved against its collection
   * — so the frontend renders the whole page with zero client-side assembly.
   */
  async getPublicPage(key: string) {
    const page = await this.prisma.page.findFirst({
      where: { key, published: true },
      include: {
        sections: { where: { enabled: true }, orderBy: { order: 'asc' } },
      },
    });
    if (!page) throw new NotFoundException(`Page "${key}" not found`);

    const sections = await Promise.all(
      page.sections.map(async (s) => ({
        id: s.id,
        type: s.type,
        order: s.order,
        data: s.data,
        resolved: await this.resolveRefs(s.type, s.data as Record<string, unknown>),
      })),
    );

    return {
      key: page.key,
      title: page.title,
      seo: {
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        ogImage: page.ogImage,
      },
      sections,
    };
  }

  /** Attach live collection data for reference-type sections. */
  private async resolveRefs(
    type: SectionType,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown> | undefined> {
    const refs = SECTION_REGISTRY[type]?.refs ?? [];
    if (refs.length === 0) return undefined;
    const resolved: Record<string, unknown> = {};

    if (refs.includes('courses')) {
      const where: Prisma.CourseWhereInput = { published: true };
      if (data.mode === 'track' && typeof data.track === 'string') {
        where.track = data.track as Prisma.CourseWhereInput['track'];
      }
      resolved.courses = await this.prisma.course.findMany({
        where,
        orderBy: [{ order: 'asc' }, { title: 'asc' }],
        take: typeof data.limit === 'number' ? data.limit : undefined,
        include: { lessons: { orderBy: { order: 'asc' } } },
      });
    }

    if (refs.includes('graduates')) {
      resolved.graduates = await this.prisma.graduate.findMany({
        where: data.featuredOnly ? { featured: true } : {},
        orderBy: [{ year: 'desc' }, { order: 'asc' }],
        take: typeof data.limit === 'number' ? data.limit : undefined,
      });
    }

    if (refs.includes('posts')) {
      resolved.posts = await this.prisma.post.findMany({
        where: { published: true },
        orderBy: { date: 'desc' },
        take: typeof data.limit === 'number' ? data.limit : 3,
        include: { category: true },
      });
    }

    if (refs.includes('testimonials')) {
      const where: Prisma.TestimonialWhereInput = { approved: true };
      if (data.featuredOnly === true) where.featured = true;
      if (typeof data.source === 'string') {
        where.source = data.source as Prisma.TestimonialWhereInput['source'];
      }
      resolved.testimonials = await this.prisma.testimonial.findMany({
        where,
        orderBy: [{ featured: 'desc' }, { order: 'asc' }, { reviewedAt: 'desc' }, { createdAt: 'desc' }],
        take: typeof data.limit === 'number' ? data.limit : undefined,
      });
    }

    return resolved;
  }
}
