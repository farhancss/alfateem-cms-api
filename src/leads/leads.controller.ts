import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { LeadsService } from './leads.service';
import {
  CreateContactDto,
  CreateRegistrationDto,
  LeadQueryDto,
  MessageQueryDto,
  UpdateLeadStatusDto,
  UpdateMessageStatusDto,
} from './dto/leads.dto';

@ApiTags('Leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  // ── Public submissions (tight rate limit + honeypot) ─────────────────────────

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('registrations')
  @ApiOperation({ summary: 'Public: submit a course registration (RegisterForm)' })
  register(@Body() dto: CreateRegistrationDto) {
    return this.leads.submitRegistration(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('contact')
  @ApiOperation({ summary: 'Public: submit a contact message' })
  contact(@Body() dto: CreateContactDto) {
    return this.leads.submitContact(dto);
  }

  // ── Admin inbox ──────────────────────────────────────────────────────────────

  @ApiBearerAuth('access-token')
  @Get('registrations')
  @ApiOperation({ summary: 'List registration leads (auth)' })
  listRegistrations(@Query() query: LeadQueryDto) {
    return this.leads.listRegistrations(query);
  }

  @ApiBearerAuth('access-token')
  @Patch('registrations/:id/status')
  @ApiOperation({ summary: 'Update a registration’s status (auth)' })
  setRegistrationStatus(@Param('id') id: string, @Body() dto: UpdateLeadStatusDto) {
    return this.leads.setRegistrationStatus(id, dto.status);
  }

  @ApiBearerAuth('access-token')
  @Get('contact')
  @ApiOperation({ summary: 'List contact messages (auth)' })
  listMessages(@Query() query: MessageQueryDto) {
    return this.leads.listMessages(query);
  }

  @ApiBearerAuth('access-token')
  @Patch('contact/:id/status')
  @ApiOperation({ summary: 'Update a contact message’s status (auth)' })
  setMessageStatus(@Param('id') id: string, @Body() dto: UpdateMessageStatusDto) {
    return this.leads.setMessageStatus(id, dto.status);
  }
}
