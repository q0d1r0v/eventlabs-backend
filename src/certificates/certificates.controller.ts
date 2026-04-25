import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
