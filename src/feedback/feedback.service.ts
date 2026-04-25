import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  findBySession(sessionId: string) {
    return this.prisma.feedback.findMany({
      where: { sessionId },
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async averageRating(sessionId: string) {
    const result = await this.prisma.feedback.aggregate({
      where: { sessionId },
      _avg: { rating: true },
      _count: true,
    });
    return { average: result._avg.rating ?? 0, total: result._count };
  }

  create(userId: string, dto: CreateFeedbackDto) {
    return this.prisma.feedback.upsert({
      where: { sessionId_userId: { sessionId: dto.sessionId, userId } },
      create: { ...dto, userId },
      update: { rating: dto.rating, comment: dto.comment },
    });
  }
}
