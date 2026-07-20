import { Body, Controller, Module } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { BadRequestException, Injectable } from '@nestjs/common';
import { IsString } from 'class-validator';
import { Post } from '@nestjs/common';

/**
 * Media module.
 *
 * Chosen strategy (per owner decision): image fields stay editable URLs pointing at
 * external storage (the existing WordPress host today). No upload/storage
 * infrastructure runs. This module therefore validates media URLs on demand so the
 * admin can catch a bad link before saving it onto a content record.
 *
 * The seam for real uploads is deliberate: to add local-disk or S3 uploads later,
 * implement a `StorageDriver` here and add a POST /media/upload endpoint with
 * mime/size validation — no other module needs to change, because content records
 * only ever store a URL string.
 */

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg'];

class ValidateUrlDto {
  @ApiProperty({ example: 'https://example.com/image.jpg' })
  @IsString()
  url!: string;
}

@Injectable()
class MediaService {
  validateUrl(url: string): { valid: boolean; reason?: string } {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { valid: false, reason: 'Not a valid URL' };
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, reason: 'URL must use http or https' };
    }
    const path = parsed.pathname.toLowerCase();
    const looksLikeImage = ALLOWED_EXT.some((ext) => path.endsWith(ext));
    if (!looksLikeImage) {
      return {
        valid: false,
        reason: `URL should point to an image (${ALLOWED_EXT.join(', ')})`,
      };
    }
    return { valid: true };
  }
}

@ApiTags('Media')
@Controller('media')
class MediaController {
  constructor(private readonly media: MediaService) {}

  @ApiBearerAuth('access-token')
  @Post('validate-url')
  @ApiOperation({ summary: 'Validate an image URL before saving it to a content field (auth)' })
  validate(@Body() dto: ValidateUrlDto) {
    const result = this.media.validateUrl(dto.url);
    if (!result.valid) throw new BadRequestException(result.reason);
    return result;
  }
}

@Module({
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
