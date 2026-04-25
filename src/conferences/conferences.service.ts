import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConferenceDto } from './dto/create-conference.dto';
import { UpdateConferenceDto } from './dto/update-conference.dto';
import { ConferenceStatus, Role } from '@prisma/client';

@Injectable()
export class ConferencesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { status?: ConferenceStatus; search?: string }) {
    return this.prisma.conference.findMany({
      where: {
        status: query.status,
        ...(query.search && {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        organizer: { select: { id: true, name: true, avatar: true } },
        _count: { select: { registrations: true, sessions: true } },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const conference = await this.prisma.conference.findUnique({
      where: { id },
      include: {
        organizer: { select: { id: true, name: true, avatar: true, email: true } },
        sessions: {
          include: {
            speaker: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { startTime: 'asc' },
        },
        _count: { select: { registrations: true } },
      },
    });
    if (!conference) throw new NotFoundException('Konferensiya topilmadi');
    return conference;
  }

  async create(organizerId: string, dto: CreateConferenceDto) {
    return this.prisma.conference.create({
      data: {
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        organizerId,
      },
    });
  }

  async update(
    id: string,
    userId: string,
    userRole: Role,
    dto: UpdateConferenceDto,
  ) {
    await this.assertOwnerOrAdmin(id, userId, userRole);
    return this.prisma.conference.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
      },
    });
  }

  async remove(id: string, userId: string, userRole: Role) {
    await this.assertOwnerOrAdmin(id, userId, userRole);
    await this.prisma.conference.delete({ where: { id } });
    return { success: true };
  }

  private async assertOwnerOrAdmin(id: string, userId: string, userRole: Role) {
    const conf = await this.prisma.conference.findUnique({ where: { id } });
    if (!conf) throw new NotFoundException('Konferensiya topilmadi');
    if (userRole !== Role.ADMIN && conf.organizerId !== userId) {
      throw new ForbiddenException('Ruxsat etilmagan');
    }
    return conf;
  }
}
