import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService) {}

  findByCode(code: string) {
    return this.prisma.certificate.findUnique({
      where: { code },
      include: {
        user: { select: { id: true, name: true, email: true } },
        conference: { select: { id: true, title: true, startDate: true, endDate: true } },
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
    const exists = await this.prisma.certificate.findUnique({
      where: { userId_conferenceId: { userId, conferenceId } },
    });
    if (exists) return exists;

    return this.prisma.certificate.create({
      data: {
        userId,
        conferenceId,
        code: uuid(),
      },
    });
  }

  async verify(code: string) {
    const cert = await this.findByCode(code);
    if (!cert) throw new NotFoundException('Sertifikat topilmadi');
    return { valid: true, certificate: cert };
  }
}
