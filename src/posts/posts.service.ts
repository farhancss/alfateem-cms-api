import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { blocksSchema } from '../common/content/blocks.schema';
import { paginate } from '../common/dto/paginated.dto';
import {
  CreateCategoryDto,
  CreatePostDto,
  PostQueryDto,
  UpdateCategoryDto,
  UpdatePostDto,
} from './dto/post.dto';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  private validateBody(body: unknown): Prisma.InputJsonValue {
    try {
      return blocksSchema.parse(body) as Prisma.InputJsonValue;
    } catch (e) {
      if (e instanceof ZodError) {
        throw new BadRequestException({
          message: 'Invalid post body',
          issues: e.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        });
      }
      throw e;
    }
  }

  private async categoryIdBySlug(slug: string): Promise<string> {
    const cat = await this.prisma.category.findUnique({ where: { slug } });
    if (!cat) throw new BadRequestException(`Category "${slug}" does not exist`);
    return cat.id;
  }

  // ── Posts ────────────────────────────────────────────────────────────────────

  async findAll(query: PostQueryDto) {
    const where: Prisma.PostWhereInput = {};
    if (query.category) where.category = { slug: query.category };
    if (query.published !== undefined) where.published = query.published;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { excerpt: { contains: query.search } },
      ];
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.post.count({ where }),
    ]);
    return paginate(rows, total, query.page, query.limit);
  }

  async findBySlug(slug: string) {
    const post = await this.prisma.post.findUnique({
      where: { slug },
      include: { category: true },
    });
    if (!post) throw new NotFoundException(`Post "${slug}" not found`);
    return post;
  }

  async create(dto: CreatePostDto) {
    const categoryId = await this.categoryIdBySlug(dto.categorySlug);
    const body = this.validateBody(dto.body);
    return this.prisma.post.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        image: dto.image,
        excerpt: dto.excerpt,
        date: new Date(dto.date),
        readingTime: dto.readingTime,
        published: dto.published ?? true,
        body,
        categoryId,
      },
      include: { category: true },
    });
  }

  async update(slug: string, dto: UpdatePostDto) {
    await this.findBySlug(slug);
    const data: Prisma.PostUpdateInput = {
      slug: dto.slug,
      title: dto.title,
      image: dto.image,
      excerpt: dto.excerpt,
      readingTime: dto.readingTime,
      published: dto.published,
    };
    if (dto.date) data.date = new Date(dto.date);
    if (dto.body !== undefined) data.body = this.validateBody(dto.body);
    if (dto.categorySlug) {
      data.category = { connect: { id: await this.categoryIdBySlug(dto.categorySlug) } };
    }
    return this.prisma.post.update({ where: { slug }, data, include: { category: true } });
  }

  async remove(slug: string) {
    await this.findBySlug(slug);
    await this.prisma.post.delete({ where: { slug } });
  }

  // ── Categories ───────────────────────────────────────────────────────────────

  listCategories() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { posts: true } } },
    });
  }

  createCategory(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  async updateCategory(slug: string, dto: UpdateCategoryDto) {
    const cat = await this.prisma.category.findUnique({ where: { slug } });
    if (!cat) throw new NotFoundException('Category not found');
    return this.prisma.category.update({ where: { slug }, data: dto });
  }

  async removeCategory(slug: string) {
    const cat = await this.prisma.category.findUnique({
      where: { slug },
      include: { _count: { select: { posts: true } } },
    });
    if (!cat) throw new NotFoundException('Category not found');
    if (cat._count.posts > 0) {
      throw new BadRequestException('Cannot delete a category that still has posts');
    }
    await this.prisma.category.delete({ where: { slug } });
  }
}
