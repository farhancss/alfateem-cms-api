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
import { Prisma, Role } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/paginated.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

class CreateGraduateDto {
  @ApiProperty() @IsString() @MinLength(2) name!: string;
  @ApiProperty({ description: 'Image URL' }) @IsString() image!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() role?: string;

  @ApiProperty({ example: 2023 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) order?: number;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() featured?: boolean;
}
class UpdateGraduateDto extends PartialType(CreateGraduateDto) {}

class GraduateQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() year?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) @IsBoolean() featured?: boolean;
}

@Injectable()
class GraduatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: GraduateQueryDto) {
    const where: Prisma.GraduateWhereInput = {};
    if (query.year) where.year = query.year;
    if (query.featured !== undefined) where.featured = query.featured;
    if (query.search) where.name = { contains: query.search };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.graduate.findMany({
        where,
        orderBy: [{ year: 'desc' }, { order: 'asc' }],
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.graduate.count({ where }),
    ]);
    return paginate(rows, total, query.page, query.limit);
  }

  async findOne(id: string) {
    const g = await this.prisma.graduate.findUnique({ where: { id } });
    if (!g) throw new NotFoundException('Graduate not found');
    return g;
  }

  create(dto: CreateGraduateDto) {
    return this.prisma.graduate.create({ data: dto });
  }

  async update(id: string, dto: UpdateGraduateDto) {
    await this.findOne(id);
    return this.prisma.graduate.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.graduate.delete({ where: { id } });
  }
}

@ApiTags('Graduates')
@Controller('graduates')
class GraduatesController {
  constructor(private readonly graduates: GraduatesService) {}

  @Public() @Get()
  @ApiOperation({ summary: 'Public: list graduates (filter by year, featured)' })
  findAll(@Query() query: GraduateQueryDto) {
    return this.graduates.findAll(query);
  }

  @ApiBearerAuth('access-token') @Post()
  @ApiOperation({ summary: 'Create a graduate (EDITOR+)' })
  create(@Body() dto: CreateGraduateDto) {
    return this.graduates.create(dto);
  }

  @ApiBearerAuth('access-token') @Patch(':id')
  @ApiOperation({ summary: 'Update a graduate (EDITOR+)' })
  update(@Param('id') id: string, @Body() dto: UpdateGraduateDto) {
    return this.graduates.update(id, dto);
  }

  @ApiBearerAuth('access-token') @Roles(Role.ADMIN) @Delete(':id') @HttpCode(204)
  @ApiOperation({ summary: 'Delete a graduate (ADMIN)' })
  remove(@Param('id') id: string) {
    return this.graduates.remove(id);
  }
}

@Module({
  controllers: [GraduatesController],
  providers: [GraduatesService],
})
export class GraduatesModule {}
