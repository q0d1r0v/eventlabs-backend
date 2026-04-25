import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { ConferencesService } from './conferences.service';
import { CreateConferenceDto } from './dto/create-conference.dto';
import { UpdateConferenceDto } from './dto/update-conference.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConferenceStatus, Role } from '@prisma/client';

const ALLOWED_IMAGE_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

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
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateConferenceDto) {
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
  @Post(':id/banner')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/banners',
        filename: (_req, file, cb) => {
          cb(null, `${uuid()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
          cb(
            new BadRequestException(
              'Faqat rasm fayllar (PNG, JPG, WEBP, GIF) ruxsat etiladi',
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadBanner(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; role: Role },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Rasm yuborilmadi');
    }
    return this.conferences.setBanner(
      id,
      user.sub,
      user.role,
      `/uploads/banners/${file.filename}`,
    );
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER)
  @Delete(':id/banner')
  removeBanner(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; role: Role },
  ) {
    return this.conferences.setBanner(id, user.sub, user.role, null);
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
