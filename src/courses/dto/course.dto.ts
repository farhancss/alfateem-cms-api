import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { BatchMode, Level, Track } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const SLUG = /^[a-z0-9-]+$/;

export class LessonInputDto {
  @ApiProperty() @IsString() @MinLength(2) title!: string;

  @ApiProperty({ example: 'html5-css3' })
  @IsString()
  @Matches(SLUG, { message: 'slug must be lowercase letters, numbers and hyphens' })
  slug!: string;

  @ApiProperty() @IsString() @MinLength(2) blurb!: string;

  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) order?: number;
}

export class CreateCourseDto {
  @ApiProperty({ example: 'web-development' })
  @IsString()
  @Matches(SLUG)
  slug!: string;

  @ApiProperty() @IsString() @MinLength(2) title!: string;
  @ApiProperty({ example: 'Web Dev' }) @IsString() short!: string;
  @ApiProperty({ enum: Track }) @IsEnum(Track) track!: Track;
  @ApiProperty({ enum: Level }) @IsEnum(Level) level!: Level;
  @ApiProperty({ example: '3 months' }) @IsString() duration!: string;
  @ApiProperty() @IsString() @MinLength(10) summary!: string;

  @ApiProperty({ type: [String], example: ['HTML5', 'CSS3', 'Git'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  stack!: string[];

  @ApiProperty() @IsString() seoTitle!: string;
  @ApiProperty() @IsString() seoDescription!: string;

  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) order?: number;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() published?: boolean;

  @ApiPropertyOptional({ type: [LessonInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonInputDto)
  lessons?: LessonInputDto[];
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

export class CreateBatchDto {
  @ApiProperty({ example: '2026-08-04', description: 'First class date (ISO 8601)' })
  @IsISO8601()
  startDate!: string;

  @ApiPropertyOptional({ enum: BatchMode, default: BatchMode.ONCAMPUS })
  @IsOptional()
  @IsEnum(BatchMode)
  mode?: BatchMode;

  @ApiProperty({ example: 'Mon · Wed · Fri — 7:00–9:00 PM' })
  @IsString()
  @MinLength(3)
  schedule!: string;

  @ApiPropertyOptional({ example: 'Rs 4,000 / month' })
  @IsOptional()
  @IsString()
  fee?: string;

  @ApiPropertyOptional({ example: 25 }) @IsOptional() @IsInt() @Min(0) seatsTotal?: number;
  @ApiPropertyOptional({ example: 12 }) @IsOptional() @IsInt() @Min(0) seatsLeft?: number;

  @ApiPropertyOptional({ example: 'Limited seats — call to reserve' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() published?: boolean;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) order?: number;
}

export class UpdateBatchDto extends PartialType(CreateBatchDto) {}

export class CourseQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Track })
  @IsOptional()
  @IsEnum(Track)
  track?: Track;

  @ApiPropertyOptional({ description: 'Filter by published flag' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  published?: boolean;
}
