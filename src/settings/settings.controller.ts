import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { SettingsService } from './settings.service';
import {
  NavItemDto,
  StatDto,
  UpdateNavItemDto,
  UpdateSettingsDto,
  UpdateStatDto,
} from './dto/settings.dto';

/**
 * Site settings, navigation and stats. Settings + nav are ADMIN-only per §7
 * ("only ADMIN can manage users and settings"); stats are editable content (EDITOR+).
 */
@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Public: bundled site settings + nav + stats' })
  bundle() {
    return this.settings.getBundle();
  }

  @ApiBearerAuth('access-token')
  @Roles(Role.ADMIN)
  @Patch()
  @ApiOperation({ summary: 'Update site settings (ADMIN)' })
  update(@Body() dto: UpdateSettingsDto) {
    return this.settings.updateSettings(dto as Record<string, unknown>);
  }

  // Nav (ADMIN)
  @Public() @Get('nav')
  @ApiOperation({ summary: 'Public: navigation items' })
  listNav() {
    return this.settings.listNav();
  }

  @ApiBearerAuth('access-token') @Roles(Role.ADMIN) @Post('nav')
  @ApiOperation({ summary: 'Create a nav item (ADMIN)' })
  createNav(@Body() dto: NavItemDto) {
    return this.settings.createNav(dto);
  }

  @ApiBearerAuth('access-token') @Roles(Role.ADMIN) @Patch('nav/:id')
  @ApiOperation({ summary: 'Update a nav item (ADMIN)' })
  updateNav(@Param('id') id: string, @Body() dto: UpdateNavItemDto) {
    return this.settings.updateNav(id, dto);
  }

  @ApiBearerAuth('access-token') @Roles(Role.ADMIN) @Delete('nav/:id') @HttpCode(204)
  @ApiOperation({ summary: 'Delete a nav item (ADMIN)' })
  deleteNav(@Param('id') id: string) {
    return this.settings.deleteNav(id);
  }

  // Stats (EDITOR+)
  @Public() @Get('stats')
  @ApiOperation({ summary: 'Public: stats band' })
  listStats() {
    return this.settings.listStats();
  }

  @ApiBearerAuth('access-token') @Post('stats')
  @ApiOperation({ summary: 'Create a stat (EDITOR+)' })
  createStat(@Body() dto: StatDto) {
    return this.settings.createStat(dto);
  }

  @ApiBearerAuth('access-token') @Patch('stats/:id')
  @ApiOperation({ summary: 'Update a stat (EDITOR+)' })
  updateStat(@Param('id') id: string, @Body() dto: UpdateStatDto) {
    return this.settings.updateStat(id, dto);
  }

  @ApiBearerAuth('access-token') @Roles(Role.ADMIN) @Delete('stats/:id') @HttpCode(204)
  @ApiOperation({ summary: 'Delete a stat (ADMIN)' })
  deleteStat(@Param('id') id: string) {
    return this.settings.deleteStat(id);
  }
}
