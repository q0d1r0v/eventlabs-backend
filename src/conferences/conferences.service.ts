import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConferenceDto } from './dto/create-conference.dto';
import { UpdateConferenceDto } from './dto/update-conference.dto';
import { ConferenceStatus, Role } from '@prisma/client';
import {
  buildStatusWhere,
  withEffectiveStatus,
} from '../common/utils/conference-status';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ConferencesService {
  private readonly logger = new Logger(ConferencesService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findAll(query: { status?: ConferenceStatus; search?: string }) {
    const now = new Date();
    const statusWhere = buildStatusWhere(query.status, now);

    const items = await this.prisma.conference.findMany({
      where: {
        ...(statusWhere ?? {}),
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

    return items.map((c) => withEffectiveStatus(c, now));
  }

  async findOne(id: string) {
    const conference = await this.prisma.conference.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { id: true, name: true, avatar: true, email: true },
        },
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
    return withEffectiveStatus(conference);
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
    const before = await this.assertOwnerOrAdmin(id, userId, userRole);

    const updated = await this.prisma.conference.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
      },
    });

    await this.notifyRegisteredOnChange(before, updated);

    return updated;
  }

  async setBanner(
    id: string,
    userId: string,
    userRole: Role,
    bannerUrl: string | null,
  ) {
    const conf = await this.assertOwnerOrAdmin(id, userId, userRole);

    // Eski bannerni diskdan tozalash (agar boshqa konferensiya ishlatmasa)
    if (conf.bannerUrl && conf.bannerUrl !== bannerUrl) {
      this.removeUploadFile(conf.bannerUrl);
    }

    return this.prisma.conference.update({
      where: { id },
      data: { bannerUrl },
    });
  }

  private removeUploadFile(relPath: string) {
    if (!relPath?.startsWith('/uploads/')) return;
    const fullPath = path.join(process.cwd(), relPath);
    fs.promises.unlink(fullPath).catch((err) => {
      this.logger.warn(
        `Eski faylni o'chirishda xatolik (${relPath}): ${err.message}`,
      );
    });
  }

  async remove(id: string, userId: string, userRole: Role) {
    const conference = await this.assertOwnerOrAdmin(id, userId, userRole);

    // O'chirilishidan oldin yozilganlarga xabar berish
    const userIds = await this.getRegisteredUserIds(id);
    if (userIds.length > 0) {
      await this.notifications.pushToUsers(userIds, {
        type: 'CONFERENCE',
        title: "Konferensiya o'chirildi",
        message: `"${conference.title}" konferensiyasi o'chirildi.`,
      });
    }

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

  private async getRegisteredUserIds(conferenceId: string): Promise<string[]> {
    const regs = await this.prisma.registration.findMany({
      where: { conferenceId, status: { not: 'CANCELLED' } },
      select: { userId: true },
    });
    return regs.map((r) => r.userId);
  }

  private async notifyRegisteredOnChange(
    before: {
      id: string;
      title: string;
      status: ConferenceStatus;
      startDate: Date;
      endDate: Date;
      location: string;
    },
    after: {
      title: string;
      status: ConferenceStatus;
      startDate: Date;
      endDate: Date;
      location: string;
    },
  ) {
    const userIds = await this.getRegisteredUserIds(before.id);
    if (userIds.length === 0) return;

    const link = `/conferences/${before.id}`;

    // Bekor qilindi
    if (before.status !== 'CANCELLED' && after.status === 'CANCELLED') {
      await this.notifications.pushToUsers(userIds, {
        type: 'CONFERENCE',
        title: 'Konferensiya bekor qilindi',
        message: `"${after.title}" konferensiyasi bekor qilindi.`,
        link,
      });
      return;
    }

    // E'lon qilindi (DRAFT → PUBLISHED) — odatda yozilganlar yo'q, lekin bo'lsa
    if (before.status === 'DRAFT' && after.status === 'PUBLISHED') {
      await this.notifications.pushToUsers(userIds, {
        type: 'CONFERENCE',
        title: "Konferensiya e'lon qilindi",
        message: `"${after.title}" endi qatnashish uchun ochiq.`,
        link,
      });
      return;
    }

    // Sana yoki joy o'zgargan bo'lsa — qatnashchilar bilishi kerak
    const dateChanged =
      before.startDate.getTime() !== after.startDate.getTime() ||
      before.endDate.getTime() !== after.endDate.getTime();
    const locationChanged = before.location !== after.location;

    if (dateChanged || locationChanged) {
      const parts: string[] = [];
      if (dateChanged) parts.push('sana');
      if (locationChanged) parts.push('joy');
      await this.notifications.pushToUsers(userIds, {
        type: 'CONFERENCE',
        title: 'Konferensiya yangilandi',
        message: `"${after.title}" konferensiyasining ${parts.join(' va ')} o'zgardi.`,
        link,
      });
    }
  }
}
