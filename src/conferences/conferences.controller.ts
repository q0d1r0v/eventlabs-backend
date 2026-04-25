import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConferencesService } from './conferences.service';
import { CreateConferenceDto } from './dto/create-conference.dto';
import { UpdateConferenceDto } from './dto/update-conference.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConferenceStatus, Role } from '@prisma/client';

@ApiTags('conferences')
@Controller('conferences')
export class ConferencesController {
  constructor(private conferences: ConferencesService) {}

  @Public()
  @Get()
  findAll(
    @Query('status') status?: ConferenceStatus,
    @Query('search') search?: string,
  ) {
    return this.conferences.findAll({ status, search });
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.conferences.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER)
  @Post()
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateConferenceDto,
  ) {
    return this.conferences.create(userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; role: Role },
    @Body() dto: UpdateConferenceDto,
  ) {
    return this.conferences.update(id, user.sub, user.role, dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER)
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; role: Role },
  ) {
    return this.conferences.remove(id, user.sub, user.role);
  }
}
