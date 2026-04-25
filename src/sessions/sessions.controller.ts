import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private sessions: SessionsService) {}

  @Public()
  @Get('conference/:conferenceId')
  findByConference(@Param('conferenceId') conferenceId: string) {
    return this.sessions.findByConference(conferenceId);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sessions.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER)
  @Post()
  create(@Body() dto: CreateSessionDto) {
    return this.sessions.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.sessions.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sessions.remove(id);
  }
}
