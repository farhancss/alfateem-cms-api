import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadStatus, MessageStatus } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/**
 * Honeypot: a field real users never see (hidden in the form) but bots fill in. When
 * non-empty, the API returns success but silently discards the submission. Named
 * `company` to look plausible to a scraper.
 */
class HoneypotBase {
  @ApiPropertyOptional({ description: 'Anti-spam honeypot — leave empty', default: '' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({
    description:
      'Marketing attribution captured client-side (utmSource, utmMedium, utmCampaign, ' +
      'utmTerm, utmContent, referrer, landingPage). Unknown keys are dropped and values ' +
      'truncated server-side.',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  attribution?: Record<string, unknown>;
}

export class CreateRegistrationDto extends HoneypotBase {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty({ example: '03XX-XXXXXXX' }) @IsString() @MinLength(7) @MaxLength(40) phone!: string;

  @ApiPropertyOptional({ description: 'Slug of the course the applicant chose' })
  @IsOptional()
  @IsString()
  courseSlug?: string;

  @ApiPropertyOptional({
    description: 'Attendance preference',
    enum: ['ONCAMPUS', 'ONLINE', 'ANY'],
  })
  @IsOptional()
  @IsIn(['ONCAMPUS', 'ONLINE', 'ANY'])
  preferredMode?: 'ONCAMPUS' | 'ONLINE' | 'ANY';

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) message?: string;
}

export class CreateContactDto extends HoneypotBase {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(160) subject!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(4000) message!: string;
}

export class UpdateLeadStatusDto {
  @ApiProperty({ enum: LeadStatus })
  @IsEnum(LeadStatus)
  status!: LeadStatus;
}

export class UpdateMessageStatusDto {
  @ApiProperty({ enum: MessageStatus })
  @IsEnum(MessageStatus)
  status!: MessageStatus;
}

export class LeadQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;
}

export class MessageQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: MessageStatus })
  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;
}
