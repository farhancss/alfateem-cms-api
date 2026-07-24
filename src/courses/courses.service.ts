import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/paginated.dto';
import {
  CourseQueryDto,
  CreateBatchDto,
  CreateCourseDto,
  LessonInputDto,
  UpdateBatchDto,
  UpdateCourseDto,
} from './dto/course.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: CourseQueryDto) {
    const where: Prisma.CourseWhereInput = {};
    if (query.track) where.track = query.track;
    if (query.published !== undefined) where.published = query.published;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { summary: { contains: query.search } },
        { short: { contains: query.search } },
      ];
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        include: {
          lessons: { orderBy: { order: 'asc' } },
          batches: CoursesService.upcomingBatches(),
        },
        orderBy: [{ order: 'asc' }, { title: 'asc' }],
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.course.count({ where }),
    ]);
    return paginate(rows, total, query.page, query.limit);
  }

  async findBySlug(slug: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      include: {
        lessons: { orderBy: { order: 'asc' } },
        batches: CoursesService.upcomingBatches(),
      },
    });
    if (!course) throw new NotFoundException(`Course "${slug}" not found`);
    return course;
  }

  /** Public batch visibility: published, starting soon or started in the last week
   *  (late joiners are common), soonest first. */
  private static upcomingBatches() {
    return {
      where: {
        published: true,
        startDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: [{ startDate: 'asc' as const }, { order: 'asc' as const }],
    };
  }

  // ── Batches (admin) ──────────────────────────────────────────────────────────

  listAdminBatches() {
    return this.prisma.batch.findMany({
      orderBy: { startDate: 'desc' },
      include: { course: { select: { slug: true, title: true, short: true } } },
    });
  }

  async createBatch(courseSlug: string, dto: CreateBatchDto) {
    const course = await this.findBySlug(courseSlug);
    return this.prisma.batch.create({
      data: { ...dto, startDate: new Date(dto.startDate), courseId: course.id },
    });
  }

  async updateBatch(id: string, dto: UpdateBatchDto) {
    const batch = await this.prisma.batch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException('Batch not found');
    return this.prisma.batch.update({
      where: { id },
      data: { ...dto, startDate: dto.startDate ? new Date(dto.startDate) : undefined },
    });
  }

  async deleteBatch(id: string) {
    const batch = await this.prisma.batch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException('Batch not found');
    await this.prisma.batch.delete({ where: { id } });
  }

  create(dto: CreateCourseDto) {
    const { lessons, stack, ...rest } = dto;
    return this.prisma.course.create({
      data: {
        ...rest,
        stack: stack as Prisma.InputJsonValue,
        lessons: lessons
          ? { create: lessons.map((l, i) => ({ ...l, order: l.order ?? i })) }
          : undefined,
      },
      include: { lessons: { orderBy: { order: 'asc' } } },
    });
  }

  async update(slug: string, dto: UpdateCourseDto) {
    await this.findBySlug(slug);
    const { lessons, stack, ...rest } = dto;
    return this.prisma.course.update({
      where: { slug },
      data: {
        ...rest,
        stack: stack ? (stack as Prisma.InputJsonValue) : undefined,
        // When lessons are provided on update, replace the set wholesale.
        lessons: lessons
          ? {
              deleteMany: {},
              create: lessons.map((l, i) => ({ ...l, order: l.order ?? i })),
            }
          : undefined,
      },
      include: { lessons: { orderBy: { order: 'asc' } } },
    });
  }

  async remove(slug: string) {
    await this.findBySlug(slug);
    await this.prisma.course.delete({ where: { slug } }); // cascades lessons
  }

  // ── Lessons as a sub-resource ────────────────────────────────────────────────

  async addLesson(slug: string, dto: LessonInputDto) {
    const course = await this.findBySlug(slug);
    return this.prisma.lesson.create({
      data: { ...dto, order: dto.order ?? course.lessons.length, courseId: course.id },
    });
  }

  async removeLesson(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.prisma.lesson.delete({ where: { id: lessonId } });
  }

  /** All lessons flattened with their parent course — powers /lesson/[slug] pages.
   *  The course must carry its own lessons (same shape as findLessonBySlug): the
   *  frontend's course mapper reads course.lessons and throws without it. */
  listAllLessons() {
    return this.prisma.lesson.findMany({
      orderBy: { order: 'asc' },
      include: { course: { include: { lessons: { orderBy: { order: 'asc' } } } } },
    });
  }

  async findLessonBySlug(slug: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { slug },
      include: { course: { include: { lessons: { orderBy: { order: 'asc' } } } } },
    });
    if (!lesson) throw new NotFoundException(`Lesson "${slug}" not found`);
    return lesson;
  }
}
