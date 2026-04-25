import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { RegistrationsService } from './registrations.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('registrations')
@Controller('registrations')
export class RegistrationsController {
  constructor(private registrations: RegistrationsService) {}

  @ApiBearerAuth()
  @Get('me')
  myRegistrations(@CurrentUser('sub') userId: string) {
    return this.registrations.findByUser(userId);
  }

  @ApiBearerAuth()
  @Get('conference/:conferenceId')
  byConference(@Param('conferenceId') conferenceId: string) {
    return this.registrations.findByConference(conferenceId);
  }

  @ApiBearerAuth()
  @Post('conference/:conferenceId')
  register(
    @CurrentUser('sub') userId: string,
    @Param('conferenceId') conferenceId: string,
  ) {
    return this.registrations.register(userId, conferenceId);
  }

  @ApiBearerAuth()
  @Delete('conference/:conferenceId')
  cancel(
    @CurrentUser('sub') userId: string,
    @Param('conferenceId') conferenceId: string,
  ) {
    return this.registrations.cancel(userId, conferenceId);
  }

  @Public()
  @Get('ticket/:code')
  async ticketByCode(@Param('code') code: string) {
    const reg = await this.registrations.findByTicketCode(code);
    if (!reg) throw new NotFoundException('Chipta topilmadi');
    if (reg.status === 'CANCELLED') {
      throw new NotFoundException('Bu chipta bekor qilingan');
    }
    return reg;
  }

  @Public()
  @Get('ticket/:code/download')
  async downloadTicket(@Param('code') code: string, @Res() res: Response) {
    const reg = await this.registrations.findByTicketCode(code);
    if (!reg) throw new NotFoundException('Chipta topilmadi');
    if (reg.status === 'CANCELLED') {
      throw new NotFoundException('Bu chipta bekor qilingan');
    }

    const filename = `${code}.pdf`;
    const fullPath = join(process.cwd(), 'uploads', 'tickets', filename);

    if (!existsSync(fullPath)) {
      // Lazy generate — agar fayl o'chgan/yo'q bo'lsa
      await this.registrations.ensureTicketPdf(code);
    }

    const safeName = `EventLab-Chipta-${code.slice(0, 8)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    createReadStream(fullPath).pipe(res);
  }
}
