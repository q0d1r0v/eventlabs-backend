import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private feedback: FeedbackService) {}

  @Public()
  @Get('session/:sessionId')
  findBySession(@Param('sessionId') sessionId: string) {
    return this.feedback.findBySession(sessionId);
  }

  @Public()
  @Get('session/:sessionId/average')
  average(@Param('sessionId') sessionId: string) {
    return this.feedback.averageRating(sessionId);
  }

  @ApiBearerAuth()
  @Post()
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.feedback.create(userId, dto);
  }
}
