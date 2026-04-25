import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const ALLOWED_AVATAR_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  me(@CurrentUser('sub') id: string) {
    return this.users.findById(id);
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (_req, file, cb) => {
          cb(null, `${uuid()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_AVATAR_MIME.has(file.mimetype)) {
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
  uploadAvatar(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Rasm yuborilmadi');
    }
    return this.users.setAvatar(userId, `/uploads/avatars/${file.filename}`);
  }

  @Delete('me/avatar')
  removeAvatar(@CurrentUser('sub') userId: string) {
    return this.users.setAvatar(userId, null);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.users.findAll();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ORGANIZER)
  @Get('speakers')
  findSpeakers() {
    return this.users.findByRole(Role.SPEAKER);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findById(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('sub') currentUserId: string,
    @Body() dto: UpdateUserDto,
  ) {
    if (id === currentUserId && dto.role && dto.role !== Role.ADMIN) {
      throw new BadRequestException(
        "O'z rolingizni admin'dan olib tashlay olmaysiz",
      );
    }
    return this.users.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser('sub') currentUserId: string) {
    if (id === currentUserId) {
      throw new BadRequestException("O'z hisobingizni o'chira olmaysiz");
    }
    return this.users.remove(id);
  }
}
