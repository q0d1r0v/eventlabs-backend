import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { v4 as uuid } from 'uuid';
import { RegistrationStatus } from '@prisma/client';

@Injectable()
export class RegistrationsService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  async register(userId: string, conferenceId: string) {
    const conf = await this.prisma.conference.findUnique({
      where: { id: conferenceId },
    });
    if (!conf) throw new NotFoundException('Konferensiya topilmadi');

    const exists = await this.prisma.registration.findUnique({
      where: { userId_conferenceId: { userId, conferenceId } },
    });
    if (exists) throw new ConflictException('Allaqachon ro‘yxatdan o‘tilgan');

    const registration = await this.prisma.registration.create({
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

    return registration;
  }

  findByUser(userId: string) {
    return this.prisma.registration.findMany({
      where: { userId },
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
