import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PagesService } from './pages.service';
import { SECTION_REGISTRY } from './section-registry';
import {
  CreatePageDto,
  CreateSectionDto,
  ReorderSectionsDto,
  UpdatePageDto,
  UpdateSectionDto,
} from './dto/page.dto';

@ApiTags('Pages')
@Controller('pages')
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  // ── Public ─────────────────────────────────────────────────────────────────

  @Public()
  @Get(':key')
  @ApiOperation({
    summary: 'Public: page with ordered, enabled sections and references resolved',
  })
  getPublic(@Param('key') key: string) {
    return this.pages.getPublicPage(key);
  }

  @Public()
  @Get('meta/section-types')
  @ApiOperation({ summary: 'Public: the section registry (types + labels + refs) for the admin' })
  sectionTypes() {
    return Object.values(SECTION_REGISTRY).map((d) => ({
      type: d.type,
      label: d.label,
      refs: d.refs,
    }));
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  @ApiBearerAuth('access-token')
  @Get()
  @ApiOperation({ summary: 'List all pages (auth)' })
  list() {
    return this.pages.listPages();
  }

  @ApiBearerAuth('access-token')
  @Get('admin/:key')
  @ApiOperation({ summary: 'Full page incl. disabled sections, unresolved (auth)' })
  getAdmin(@Param('key') key: string) {
    return this.pages.getPageForAdmin(key);
  }

  @ApiBearerAuth('access-token')
  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a page (ADMIN)' })
  createPage(@Body() dto: CreatePageDto) {
    return this.pages.createPage(dto);
  }

  @ApiBearerAuth('access-token')
  @Patch(':key')
  @ApiOperation({ summary: 'Update page meta/SEO (EDITOR+)' })
  updatePage(@Param('key') key: string, @Body() dto: UpdatePageDto) {
    return this.pages.updatePage(key, dto);
  }

  @ApiBearerAuth('access-token')
  @Roles(Role.ADMIN)
  @Delete(':key')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a page and its sections (ADMIN)' })
  deletePage(@Param('key') key: string) {
    return this.pages.deletePage(key);
  }

  // Sections (folds)
  @ApiBearerAuth('access-token')
  @Post(':key/sections')
  @ApiOperation({ summary: 'Add a section to a page (EDITOR+)' })
  addSection(@Param('key') key: string, @Body() dto: CreateSectionDto) {
    return this.pages.addSection(key, dto);
  }

  @ApiBearerAuth('access-token')
  @Put(':key/sections/reorder')
  @ApiOperation({ summary: 'Reorder a page’s sections (EDITOR+)' })
  reorder(@Param('key') key: string, @Body() dto: ReorderSectionsDto) {
    return this.pages.reorder(key, dto);
  }

  @ApiBearerAuth('access-token')
  @Patch('sections/:sectionId')
  @ApiOperation({ summary: 'Update a section’s data/order/enabled (EDITOR+)' })
  updateSection(@Param('sectionId') sectionId: string, @Body() dto: UpdateSectionDto) {
    return this.pages.updateSection(sectionId, dto);
  }

  @ApiBearerAuth('access-token')
  @Delete('sections/:sectionId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a section (EDITOR+)' })
  deleteSection(@Param('sectionId') sectionId: string) {
    return this.pages.deleteSection(sectionId);
  }
}
