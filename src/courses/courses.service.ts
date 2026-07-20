import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/paginated.dto';
import { CourseQueryDto, CreateCourseDto, LessonInputDto, UpdateCourseDto } from './dto/course.dto';

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
        include: { lessons: { orderBy: { order: 'asc' } } },
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
      include: { lessons: { orderBy: { order: 'asc' } } },
    });
    if (!course) throw new NotFoundException(`Course "${slug}" not found`);
    return course;
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

  /** All lessons flattened with their parent course — powers /lesson/[slug] pages. */
  listAllLessons() {
    return this.prisma.lesson.findMany({
      orderBy: { order: 'asc' },
      include: { course: true },
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
