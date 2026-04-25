import {
  Controller,
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
import { CertificatesService } from './certificates.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private certificates: CertificatesService) {}

  @Public()
  @Get('verify/:code')
  verify(@Param('code') code: string) {
    return this.certificates.verify(code);
  }

  @Public()
  @Get('download/:code')
  async download(@Param('code') code: string, @Res() res: Response) {
    const cert = await this.certificates.findByCode(code);
    if (!cert) throw new NotFoundException('Sertifikat topilmadi');

    const filename = `${code}.pdf`;
    const fullPath = join(process.cwd(), 'uploads', 'certificates', filename);
    if (!existsSync(fullPath)) {
      throw new NotFoundException('Sertifikat fayli topilmadi');
    }

    const safeName = `EventLab-Sertifikat-${code.slice(0, 8)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    createReadStream(fullPath).pipe(res);
  }

  @ApiBearerAuth()
  @Get('me')
  myCertificates(@CurrentUser('sub') userId: string) {
    return this.certificates.findByUser(userId);
  }

  @ApiBearerAuth()
  @Post('issue/:conferenceId')
  issue(
    @CurrentUser('sub') userId: string,
    @Param('conferenceId') conferenceId: string,
  ) {
    return this.certificates.issue(userId, conferenceId);
  }
}
