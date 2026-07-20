import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const SLUG = /^[a-z0-9-]+$/;

export class CreateCategoryDto {
  @ApiProperty({ example: 'Technology' }) @IsString() @MinLength(2) name!: string;
  @ApiProperty({ example: 'technology' }) @IsString() @Matches(SLUG) slug!: string;
}
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

export class CreatePostDto {
  @ApiProperty({ example: 'how-to-secure-wordpress' })
  @IsString()
  @Matches(SLUG)
  slug!: string;

  @ApiProperty() @IsString() @MinLength(3) title!: string;

  @ApiProperty({ example: 'technology', description: 'Category slug (must already exist)' })
  @IsString()
  categorySlug!: string;

  @ApiProperty({ description: 'Image URL' }) @IsString() image!: string;
  @ApiProperty() @IsString() @MinLength(10) excerpt!: string;

  @ApiProperty({ example: '2021-06-25', description: 'Publication date (ISO 8601)' })
  @IsISO8601()
  date!: string;

  @ApiProperty({ example: '6 min read' }) @IsString() readingTime!: string;

  @ApiProperty({
    description: 'Ordered array of typed blocks (p|h2|h3|ul|ol|code). Validated on write.',
    isArray: true,
    type: 'object',
    additionalProperties: true,
  })
  @IsArray()
  body!: unknown[];

  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() published?: boolean;
}

export class UpdatePostDto extends PartialType(CreatePostDto) {}

export class PostQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by category slug' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  published?: boolean;
}
