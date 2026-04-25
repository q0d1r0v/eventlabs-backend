import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { MaterialsService } from './materials.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('materials')
@Controller('materials')
export class MaterialsController {
  constructor(private materials: MaterialsService) {}

  @Public()
  @Get('session/:sessionId')
  findBySession(@Param('sessionId') sessionId: string) {
    return this.materials.findBySession(sessionId);
  }

  @ApiBearerAuth()
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/materials',
        filename: (_req, file, cb) => {
          cb(null, `${uuid()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('sessionId') sessionId: string,
  ) {
    return this.materials.create({
      sessionId,
      fileUrl: `/uploads/materials/${file.filename}`,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
    });
  }

  @ApiBearerAuth()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.materials.remove(id);
  }
}
