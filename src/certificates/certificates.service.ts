import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuid } from 'uuid';
import { computeEffectiveStatus } from '../common/utils/conference-status';
import { NotificationsService } from '../notifications/notifications.service';
import { CertificatePdfService } from './certificate-pdf.service';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private pdf: CertificatePdfService,
  ) {}

  findByCode(code: string) {
    return this.prisma.certificate.findUnique({
      where: { code },
      include: {
        user: { select: { id: true, name: true, email: true } },
        conference: {
          select: { id: true, title: true, startDate: true, endDate: true },
        },
      },
    });
  }

  findByUser(userId: string) {
    return this.prisma.certificate.findMany({
      where: { userId },
      include: { conference: true },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async issue(userId: string, conferenceId: string) {
    const conference = await this.prisma.conference.findUnique({
      where: { id: conferenceId },
      include: {
        organizer: { select: { name: true } },
      },
    });
    if (!conference) {
      throw new NotFoundException('Konferensiya topilmadi');
    }

    const effectiveStatus = computeEffectiveStatus(conference);
    if (effectiveStatus !== 'FINISHED') {
      throw new BadRequestException(
        'Sertifikat faqat tugagan konferensiyalardan olinadi',
      );
    }

    const registration = await this.prisma.registration.findUnique({
      where: { userId_conferenceId: { userId, conferenceId } },
    });
    if (!registration || registration.status === 'CANCELLED') {
      throw new ForbiddenException(
        "Siz bu konferensiyaga ro'yxatdan o'tmagansiz",
      );
    }

    const exists = await this.prisma.certificate.findUnique({
      where: { userId_conferenceId: { userId, conferenceId } },
    });
    if (exists) {
      // Mavjud sertifikatda PDF yo'q bo'lsa, yaratib qo'yamiz
      if (!exists.pdfUrl) {
        const url = await this.generatePdfFor(exists.code, userId, conference);
        return this.prisma.certificate.update({
          where: { id: exists.id },
          data: { pdfUrl: url },
        });
      }
      return exists;
    }

    const code = uuid();
    const pdfUrl = await this.generatePdfFor(code, userId, conference);

    const created = await this.prisma.certificate.create({
      data: {
        userId,
        conferenceId,
        code,
        pdfUrl,
      },
    });

    await this.notifications.pushToUser(userId, {
      type: 'CERTIFICATE',
      title: 'Sertifikat tayyor',
      message: `"${conference.title}" konferensiyasi uchun sertifikatingiz tayyor.`,
      link: `/certificates/${created.code}`,
    });

    return created;
  }

  async verify(code: string) {
    const cert = await this.findByCode(code);
    if (!cert) throw new NotFoundException('Sertifikat topilmadi');
    return { valid: true, certificate: cert };
  }

  private async generatePdfFor(
    code: string,
    userId: string,
    conference: {
      id: string;
      title: string;
      startDate: Date;
      endDate: Date;
      organizer?: { name: string } | null;
    },
  ): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    try {
      return await this.pdf.generate({
        code,
        userName: user.name,
        conferenceTitle: conference.title,
        conferenceStartDate: conference.startDate,
        conferenceEndDate: conference.endDate,
        organizerName: conference.organizer?.name,
        issuedAt: new Date(),
      });
    } catch (err) {
      this.logger.error(
        `PDF generatsiyasi muvaffaqiyatsiz (code=${code}): ${(err as Error).message}`,
      );
      throw new BadRequestException('Sertifikat fayli yaratilmadi');
    }
  }
}
