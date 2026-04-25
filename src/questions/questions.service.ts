import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  findBySession(sessionId: string) {
    return this.prisma.question.findMany({
      where: { sessionId },
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: [{ upvotes: 'desc' }, { createdAt: 'asc' }],
    });
  }

  create(userId: string, dto: CreateQuestionDto) {
    return this.prisma.question.create({
      data: { sessionId: dto.sessionId, text: dto.text, userId },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
  }

  async upvote(id: string) {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Savol topilmadi');
    return this.prisma.question.update({
      where: { id },
      data: { upvotes: { increment: 1 } },
    });
  }

  answer(id: string, answer: string) {
    return this.prisma.question.update({
      where: { id },
      data: { isAnswered: true, answer },
    });
  }
}
