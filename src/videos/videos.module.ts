import {
  BadRequestException,
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
import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/paginated.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

/**
 * Extract the 11-char YouTube video id from any URL shape an admin will paste:
 * watch?v=, youtu.be/, /embed/, /shorts/, /live/. Returns null when unparseable.
 */
export function parseYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /\/embed\/([A-Za-z0-9_-]{11})/,
    /\/shorts\/([A-Za-z0-9_-]{11})/,
    /\/live\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

class CreateVideoDto {
  @ApiProperty({ example: 'How our React & Next.js course works' })
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiProperty({
    example: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    description: 'Any YouTube URL shape — watch, youtu.be, shorts, embed, live',
  })
  @IsString()
  youtubeUrl!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) order?: number;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() published?: boolean;
}
class UpdateVideoDto extends PartialType(CreateVideoDto) {}

@Injectable()
class VideosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const where: Prisma.VideoWhereInput = { published: true };
    if (query.search) where.title = { contains: query.search };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.video.findMany({
        where,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.video.count({ where }),
    ]);
    return paginate(rows, total, query.page, query.limit);
  }

  listAdmin() {
    return this.prisma.video.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
  }

  /** Parse + validate the video id; throws a clear 400 on an unusable URL. */
  private requireVideoId(youtubeUrl: string): string {
    const id = parseYouTubeId(youtubeUrl);
    if (!id) {
      throw new BadRequestException(
        'Could not read a YouTube video id from that URL. Paste a link like https://www.youtube.com/watch?v=… or https://youtu.be/…',
      );
    }
    return id;
  }

  create(dto: CreateVideoDto) {
    return this.prisma.video.create({
      data: { ...dto, videoId: this.requireVideoId(dto.youtubeUrl) },
    });
  }

  async update(id: string, dto: UpdateVideoDto) {
    const video = await this.prisma.video.findUnique({ where: { id } });
    if (!video) throw new NotFoundException('Video not found');
    return this.prisma.video.update({
      where: { id },
      data: {
        ...dto,
        videoId: dto.youtubeUrl ? this.requireVideoId(dto.youtubeUrl) : undefined,
      },
    });
  }

  async remove(id: string) {
    const video = await this.prisma.video.findUnique({ where: { id } });
    if (!video) throw new NotFoundException('Video not found');
    await this.prisma.video.delete({ where: { id } });
  }
}

@ApiTags('Videos')
@Controller('videos')
class VideosController {
  constructor(private readonly videos: VideosService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Public: published videos for the gallery' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.videos.findAll(query);
  }

  @ApiBearerAuth('access-token')
  @Get('admin')
  @ApiOperation({ summary: 'All videos incl. unpublished (EDITOR+)' })
  listAdmin() {
    return this.videos.listAdmin();
  }

  @ApiBearerAuth('access-token')
  @Post()
  @ApiOperation({ summary: 'Add a video (EDITOR+)' })
  create(@Body() dto: CreateVideoDto) {
    return this.videos.create(dto);
  }

  @ApiBearerAuth('access-token')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a video (EDITOR+)' })
  update(@Param('id') id: string, @Body() dto: UpdateVideoDto) {
    return this.videos.update(id, dto);
  }

  @ApiBearerAuth('access-token')
  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a video (ADMIN)' })
  remove(@Param('id') id: string) {
    return this.videos.remove(id);
  }
}

@Module({ controllers: [VideosController], providers: [VideosService] })
export class VideosModule {}
