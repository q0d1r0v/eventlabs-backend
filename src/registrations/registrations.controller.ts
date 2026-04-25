import { Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RegistrationsService } from './registrations.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('registrations')
@ApiBearerAuth()
@Controller('registrations')
export class RegistrationsController {
  constructor(private registrations: RegistrationsService) {}

  @Get('me')
  myRegistrations(@CurrentUser('sub') userId: string) {
    return this.registrations.findByUser(userId);
  }

  @Get('conference/:conferenceId')
  byConference(@Param('conferenceId') conferenceId: string) {
    return this.registrations.findByConference(conferenceId);
  }

  @Post('conference/:conferenceId')
  register(
    @CurrentUser('sub') userId: string,
    @Param('conferenceId') conferenceId: string,
  ) {
    return this.registrations.register(userId, conferenceId);
  }

  @Delete('conference/:conferenceId')
  cancel(
    @CurrentUser('sub') userId: string,
    @Param('conferenceId') conferenceId: string,
  ) {
    return this.registrations.cancel(userId, conferenceId);
  }
}
