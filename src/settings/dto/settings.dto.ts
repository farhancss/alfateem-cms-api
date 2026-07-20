import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

class AddressDto {
  @ApiProperty() @IsString() street!: string;
  @ApiProperty() @IsString() city!: string;
  @ApiProperty() @IsString() region!: string;
  @ApiProperty() @IsString() country!: string;
}

/**
 * Scalar fields are validated by class-validator here; the nested contact/social/media
 * objects are validated by Zod in the service (they are free-form JSON columns). Sent
 * as a single PATCH so the admin can edit settings as one form.
 */
export class UpdateSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() legalName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tagline?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() url?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() founded?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() twitterHandle?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  contact?: { email: string; phones: string[]; address: AddressDto };

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  social?: Record<string, string>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  media?: Record<string, string>;
}

export class NavItemDto {
  @ApiProperty() @IsString() @MinLength(1) label!: string;
  @ApiProperty() @IsString() href!: string;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() hasMegaMenu?: boolean;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) order?: number;
}
export class UpdateNavItemDto extends PartialType(NavItemDto) {}

export class StatDto {
  @ApiProperty({ example: 3500 }) @IsInt() value!: number;
  @ApiPropertyOptional({ example: '+' }) @IsOptional() @IsString() suffix?: string;
  @ApiProperty({ example: 'Graduates placed in jobs' }) @IsString() label!: string;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) order?: number;
}
export class UpdateStatDto extends PartialType(StatDto) {}
