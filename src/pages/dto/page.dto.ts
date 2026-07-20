import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { SectionType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreatePageDto {
  @ApiProperty({ example: 'home', description: 'Stable key used by the frontend to fetch the page' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'key must be lowercase letters, numbers and hyphens' })
  key!: string;

  @ApiProperty({ example: 'Home' })
  @IsString()
  title!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() metaTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() metaDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ogImage?: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() published?: boolean;
}

export class UpdatePageDto extends PartialType(CreatePageDto) {}

export class CreateSectionDto {
  @ApiProperty({ enum: SectionType })
  @IsEnum(SectionType)
  type!: SectionType;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({
    description:
      'Typed payload for this section type. Validated against the section registry ' +
      '(see GET /pages/meta/section-types for the schema of each type).',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  data!: Record<string, unknown>;
}

export class UpdateSectionDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) order?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enabled?: boolean;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class ReorderItemDto {
  @ApiProperty() @IsString() id!: string;
  @ApiProperty() @IsInt() @Min(0) order!: number;
}

export class ReorderSectionsDto {
  @ApiProperty({ type: [ReorderItemDto] })
  items!: ReorderItemDto[];
}
