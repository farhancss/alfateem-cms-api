import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
  PartialType,
} from '@nestjs/swagger';
import { Prisma, ReviewSource, Role } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/paginated.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

class CreateTestimonialDto {
  @ApiProperty({ example: 'Ayesha Khan' }) @IsString() @MinLength(2) author!: string;
  @ApiPropertyOptional({ description: 'Role/title, e.g. "Frontend Developer"' })
  @IsOptional() @IsString() role?: string;
  @ApiProperty() @IsString() @MinLength(4) quote!: string;

  @ApiProperty({ minimum: 1, maximum: 5, default: 5 })
  @IsInt() @Min(1) @Max(5) rating!: number;

  @ApiPropertyOptional({ enum: ReviewSource, default: ReviewSource.MANUAL })
  @IsOptional() @IsEnum(ReviewSource) source?: ReviewSource;

  @ApiPropertyOptional({ description: 'Link to the original review' })
  @IsOptional() @IsString() sourceUrl?: string;
  @ApiPropertyOptional({ description: 'Avatar image URL' })
  @IsOptional() @IsString() avatar?: string;

  @ApiPropertyOptional({ description: 'When the review was left (ISO date)' })
  @IsOptional() @IsISO8601() reviewedAt?: string;

  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() approved?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() featured?: boolean;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) order?: number;
}
class UpdateTestimonialDto extends PartialType(CreateTestimonialDto) {}

class TestimonialQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ReviewSource })
  @IsOptional() @IsEnum(ReviewSource) source?: ReviewSource;
  @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) @IsBoolean() featured?: boolean;
  @ApiPropertyOptional({ description: 'Public reads force approved=true regardless.' })
  @IsOptional() @Type(() => Boolean) @IsBoolean() approved?: boolean;
}

function toData(dto: CreateTestimonialDto | UpdateTestimonialDto) {
  const { reviewedAt, ...rest } = dto;
  return {
    ...rest,
    ...(reviewedAt !== undefined ? { reviewedAt: reviewedAt ? new Date(reviewedAt) : null } : {}),
  };
}

@Injectable()
class TestimonialsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public list — approved only, newest reviews first, featured surfaced. */
  async findPublic(query: TestimonialQueryDto) {
    const where: Prisma.TestimonialWhereInput = { approved: true };
    if (query.source) where.source = query.source;
    if (query.featured !== undefined) where.featured = query.featured;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.testimonial.findMany({
        where,
        orderBy: [{ featured: 'desc' }, { order: 'asc' }, { reviewedAt: 'desc' }, { createdAt: 'desc' }],
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.testimonial.count({ where }),
    ]);
    return paginate(rows, total, query.page, query.limit);
  }

  /** Admin list — every review (any approval state). */
  async findAll(query: TestimonialQueryDto) {
    const where: Prisma.TestimonialWhereInput = {};
    if (query.source) where.source = query.source;
    if (query.featured !== undefined) where.featured = query.featured;
    if (query.approved !== undefined) where.approved = query.approved;
    if (query.search) where.OR = [{ author: { contains: query.search } }, { quote: { contains: query.search } }];
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.testimonial.findMany({
        where,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.testimonial.count({ where }),
    ]);
    return paginate(rows, total, query.page, query.limit);
  }

  async findOne(id: string) {
    const t = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Testimonial not found');
    return t;
  }

  create(dto: CreateTestimonialDto) {
    return this.prisma.testimonial.create({ data: toData(dto) as Prisma.TestimonialCreateInput });
  }

  async update(id: string, dto: UpdateTestimonialDto) {
    await this.findOne(id);
    return this.prisma.testimonial.update({ where: { id }, data: toData(dto) });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.testimonial.delete({ where: { id } });
  }
}

@ApiTags('Testimonials')
@Controller('testimonials')
class TestimonialsController {
  constructor(private readonly testimonials: TestimonialsService) {}

  @Public() @Get()
  @ApiOperation({ summary: 'Public: list approved reviews (filter by source, featured)' })
  findPublic(@Query() query: TestimonialQueryDto) {
    return this.testimonials.findPublic(query);
  }

  @ApiBearerAuth('access-token') @Get('admin')
  @ApiOperation({ summary: 'List all reviews incl. unapproved (EDITOR+)' })
  findAll(@Query() query: TestimonialQueryDto) {
    return this.testimonials.findAll(query);
  }

  @ApiBearerAuth('access-token') @Post()
  @ApiOperation({ summary: 'Create a review (EDITOR+)' })
  create(@Body() dto: CreateTestimonialDto) {
    return this.testimonials.create(dto);
  }

  @ApiBearerAuth('access-token') @Patch(':id')
  @ApiOperation({ summary: 'Update a review (EDITOR+)' })
  update(@Param('id') id: string, @Body() dto: UpdateTestimonialDto) {
    return this.testimonials.update(id, dto);
  }

  @ApiBearerAuth('access-token') @Roles(Role.ADMIN) @Delete(':id') @HttpCode(204)
  @ApiOperation({ summary: 'Delete a review (ADMIN)' })
  remove(@Param('id') id: string) {
    return this.testimonials.remove(id);
  }
}

@Module({
  controllers: [TestimonialsController],
  providers: [TestimonialsService],
})
export class TestimonialsModule {}
