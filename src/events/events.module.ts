import { Module } from '@nestjs/common';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags, PartialType } from '@nestjs/swagger';
import { Prisma, Role } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsBoolean, IsISO8601, IsInt, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/paginated.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

const SLUG = /^[a-z0-9-]+$/;

class CreateEventDto {
  @ApiProperty({ example: 'event-2023-14th-year-celebration' })
  @IsString()
  @Matches(SLUG)
  slug!: string;

  @ApiProperty() @IsString() @MinLength(3) title!: string;
  @ApiProperty({ example: '2023-06-10' }) @IsISO8601() date!: string;
  @ApiProperty() @IsString() blurb!: string;
  @ApiProperty({ description: 'Cover image URL' }) @IsString() cover!: string;

  @ApiProperty({ type: [String], description: 'Gallery image URLs' })
  @IsArray()
  @IsString({ each: true })
  images!: string[];

  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) order?: number;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() published?: boolean;
}
class UpdateEventDto extends PartialType(CreateEventDto) {}

@Injectable()
class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const where: Prisma.EventWhereInput = query.search
      ? { title: { contains: query.search } }
      : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        orderBy: [{ date: 'desc' }, { order: 'asc' }],
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.event.count({ where }),
    ]);
    return paginate(rows, total, query.page, query.limit);
  }

  async findBySlug(slug: string) {
    const event = await this.prisma.event.findUnique({ where: { slug } });
    if (!event) throw new NotFoundException(`Event "${slug}" not found`);
    return event;
  }

  create(dto: CreateEventDto) {
    return this.prisma.event.create({
      data: { ...dto, date: new Date(dto.date), images: dto.images as Prisma.InputJsonValue },
    });
  }

  async update(slug: string, dto: UpdateEventDto) {
    await this.findBySlug(slug);
    return this.prisma.event.update({
      where: { slug },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
        images: dto.images ? (dto.images as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  async remove(slug: string) {
    await this.findBySlug(slug);
    await this.prisma.event.delete({ where: { slug } });
  }
}

@ApiTags('Events')
@Controller('events')
class EventsController {
  constructor(private readonly events: EventsService) {}

  @Public() @Get()
  @ApiOperation({ summary: 'Public: list events' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.events.findAll(query);
  }

  @Public() @Get(':slug')
  @ApiOperation({ summary: 'Public: a single event with its gallery' })
  findOne(@Param('slug') slug: string) {
    return this.events.findBySlug(slug);
  }

  @ApiBearerAuth('access-token') @Post()
  @ApiOperation({ summary: 'Create an event (EDITOR+)' })
  create(@Body() dto: CreateEventDto) {
    return this.events.create(dto);
  }

  @ApiBearerAuth('access-token') @Patch(':slug')
  @ApiOperation({ summary: 'Update an event (EDITOR+)' })
  update(@Param('slug') slug: string, @Body() dto: UpdateEventDto) {
    return this.events.update(slug, dto);
  }

  @ApiBearerAuth('access-token') @Roles(Role.ADMIN) @Delete(':slug') @HttpCode(204)
  @ApiOperation({ summary: 'Delete an event (ADMIN)' })
  remove(@Param('slug') slug: string) {
    return this.events.remove(slug);
  }
}

@Module({
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
