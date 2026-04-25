import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  findByConference(conferenceId: string) {
    return this.prisma.session.findMany({
      where: { conferenceId },
      include: {
        speaker: { select: { id: true, name: true, avatar: true } },
        _count: { select: { questions: true, materials: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(id: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        speaker: true,
        materials: true,
        questions: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: [{ upvotes: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });
    if (!session) throw new NotFoundException('Sessiya topilmadi');
    return session;
  }

  create(dto: CreateSessionDto) {
    return this.prisma.session.create({
      data: {
        ...dto,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
      },
    });
  }

  update(id: string, dto: UpdateSessionDto) {
    return this.prisma.session.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.startTime && { startTime: new Date(dto.startTime) }),
        ...(dto.endTime && { endTime: new Date(dto.endTime) }),
      },
    });
  }

  async remove(id: string) {
    await this.prisma.session.delete({ where: { id } });
    return { success: true };
  }
}
