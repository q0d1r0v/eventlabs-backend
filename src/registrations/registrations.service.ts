import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { v4 as uuid } from 'uuid';
import { RegistrationStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { computeEffectiveStatus } from '../common/utils/conference-status';
import { TicketPdfService } from './ticket-pdf.service';

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private notifications: NotificationsService,
    private ticketPdf: TicketPdfService,
  ) {}

  async register(userId: string, conferenceId: string) {
    const conf = await this.prisma.conference.findUnique({
      where: { id: conferenceId },
    });
    if (!conf) throw new NotFoundException('Konferensiya topilmadi');

    const effectiveStatus = computeEffectiveStatus(conf);
    if (effectiveStatus === 'DRAFT') {
      throw new BadRequestException("Bu konferensiya hali e'lon qilinmagan");
    }
    if (effectiveStatus === 'CANCELLED') {
      throw new BadRequestException('Bu konferensiya bekor qilingan');
    }
    if (effectiveStatus === 'FINISHED') {
      throw new BadRequestException('Konferensiya allaqachon tugagan');
    }

    if (conf.maxAttendees) {
      const count = await this.prisma.registration.count({
        where: { conferenceId, status: { not: 'CANCELLED' } },
      });
      if (count >= conf.maxAttendees) {
        throw new BadRequestException("Konferensiya joylari to'lib qolgan");
      }
    }

    const exists = await this.prisma.registration.findUnique({
      where: { userId_conferenceId: { userId, conferenceId } },
    });
    if (exists && exists.status !== RegistrationStatus.CANCELLED) {
      throw new ConflictException('Allaqachon ro‘yxatdan o‘tilgan');
    }

    // Avval bekor qilingan bo'lsa — qayta tiklaymiz, yangi chipta kodi
    const registration = exists
      ? await this.prisma.registration.update({
          where: { id: exists.id },
          data: {
            status: RegistrationStatus.CONFIRMED,
            ticketCode: uuid(),
          },
          include: { user: true },
        })
      : await this.prisma.registration.create({
          data: {
            userId,
            conferenceId,
            ticketCode: uuid(),
            status: RegistrationStatus.CONFIRMED,
          },
          include: { user: true },
        });

    this.email.sendTicket(
      registration.user.email,
      conf.title,
      registration.ticketCode,
    );

    // Chipta PDF yaratish (xato bo'lsa, registration baribir saqlanadi)
    try {
      await this.ticketPdf.generate({
        ticketCode: registration.ticketCode,
        userName: registration.user.name,
        userEmail: registration.user.email,
        conferenceTitle: conf.title,
        conferenceStartDate: conf.startDate,
        conferenceEndDate: conf.endDate,
        location: conf.location,
        isOnline: conf.isOnline,
        category: conf.category,
      });
    } catch (err) {
      this.logger.warn(
        `Chipta PDF yaratilmadi (${registration.ticketCode}): ${(err as Error).message}`,
      );
    }

    // Welcome bildirishnoma
    await this.notifications.pushToUser(userId, {
      type: 'CONFERENCE',
      title: "Ro'yxatdan o'tdingiz",
      message: `"${conf.title}" konferensiyasiga muvaffaqiyatli yozildingiz.`,
      link: `/conferences/${conferenceId}`,
    });

    return registration;
  }

  async findByTicketCode(ticketCode: string) {
    return this.prisma.registration.findUnique({
      where: { ticketCode },
      include: {
        user: { select: { id: true, name: true, email: true } },
        conference: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            location: true,
            isOnline: true,
            category: true,
          },
        },
      },
    });
  }

  async ensureTicketPdf(ticketCode: string): Promise<string> {
    const registration = await this.prisma.registration.findUnique({
      where: { ticketCode },
      include: {
        user: { select: { name: true, email: true } },
        conference: {
          select: {
            title: true,
            startDate: true,
            endDate: true,
            location: true,
            isOnline: true,
            category: true,
          },
        },
      },
    });
    if (!registration) {
      throw new NotFoundException('Chipta topilmadi');
    }

    return this.ticketPdf.generate({
      ticketCode: registration.ticketCode,
      userName: registration.user.name,
      userEmail: registration.user.email,
      conferenceTitle: registration.conference.title,
      conferenceStartDate: registration.conference.startDate,
      conferenceEndDate: registration.conference.endDate,
      location: registration.conference.location,
      isOnline: registration.conference.isOnline,
      category: registration.conference.category,
    });
  }

  findByUser(userId: string) {
    return this.prisma.registration.findMany({
      where: {
        userId,
        status: { not: RegistrationStatus.CANCELLED },
      },
      include: { conference: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByConference(conferenceId: string) {
    return this.prisma.registration.findMany({
      where: { conferenceId },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancel(userId: string, conferenceId: string) {
    return this.prisma.registration.update({
      where: { userId_conferenceId: { userId, conferenceId } },
      data: { status: RegistrationStatus.CANCELLED },
    });
  }
}
