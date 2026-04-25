import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('questions')
@Controller('questions')
export class QuestionsController {
  constructor(private questions: QuestionsService) {}

  @Public()
  @Get('session/:sessionId')
  findBySession(@Param('sessionId') sessionId: string) {
    return this.questions.findBySession(sessionId);
  }

  @ApiBearerAuth()
  @Post()
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.questions.create(userId, dto);
  }

  @ApiBearerAuth()
  @Post(':id/upvote')
  upvote(@Param('id') id: string) {
    return this.questions.upvote(id);
  }

  @ApiBearerAuth()
  @Post(':id/answer')
  answer(@Param('id') id: string, @Body('answer') answer: string) {
    return this.questions.answer(id, answer);
  }
}
