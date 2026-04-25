import {
  Body,
  Controller,
  forwardRef,
  Get,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { EventsGateway } from '../gateway/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('questions')
@Controller('questions')
export class QuestionsController {
  constructor(
    private questions: QuestionsService,
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private notifications: NotificationsService,
    @Inject(forwardRef(() => EventsGateway))
    private gateway: EventsGateway,
  ) {}

  @Public()
  @Get('session/:sessionId')
  findBySession(@Param('sessionId') sessionId: string) {
    return this.questions.findBySession(sessionId);
  }

  @ApiBearerAuth()
  @Post()
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    const question = await this.questions.create(userId, dto);
    this.gateway.notifySession(dto.sessionId, 'new_question', question);

    // Sessiya ma'ruzachisini bildiramiz (agar mavjud bo'lsa va boshqa odam savol bersa)
    const session = await this.prisma.session.findUnique({
      where: { id: dto.sessionId },
      select: {
        title: true,
        speakerId: true,
        conferenceId: true,
      },
    });
    if (session?.speakerId && session.speakerId !== userId) {
      await this.notifications.pushToUser(session.speakerId, {
        type: 'QUESTION',
        title: 'Yangi savol',
        message: `"${session.title}" sessiyangizga yangi savol berildi.`,
        link: `/conferences/${session.conferenceId}`,
      });
    }

    return question;
  }

  @ApiBearerAuth()
  @Post(':id/upvote')
  async upvote(@Param('id') id: string) {
    const updated = await this.questions.upvote(id);
    this.gateway.notifySession(updated.sessionId, 'question_upvoted', updated);
    return updated;
  }

  @ApiBearerAuth()
  @Post(':id/answer')
  async answer(
    @Param('id') id: string,
    @CurrentUser('sub') answererId: string,
    @Body('answer') answer: string,
  ) {
    const updated = await this.questions.answer(id, answer);
    this.gateway.notifySession(updated.sessionId, 'question_answered', updated);

    // Savol egasiga javob berilganini xabar beramiz
    if (updated.userId && updated.userId !== answererId) {
      const session = await this.prisma.session.findUnique({
        where: { id: updated.sessionId },
        select: { title: true, conferenceId: true },
      });
      await this.notifications.pushToUser(updated.userId, {
        type: 'QUESTION',
        title: 'Savolingizga javob berildi',
        message: session?.title
          ? `"${session.title}" sessiyasidagi savolingizga javob keldi.`
          : 'Savolingizga javob keldi.',
        link: session?.conferenceId
          ? `/conferences/${session.conferenceId}`
          : undefined,
      });
    }

    return updated;
  }
}
