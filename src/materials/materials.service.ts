import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  findBySession(sessionId: string) {
    return this.prisma.material.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Sessiyaga material yuklash — faqat speaker (o'sha sessiyaga biriktirilgan),
   * konferensiya organizeri yoki ADMIN.
   */
  async createForSession(
    userId: string,
    userRole: Role,
    data: {
      sessionId: string;
      fileUrl: string;
      fileName: string;
      fileType: string;
      fileSize: number;
    },
  ) {
    await this.assertCanManageSession(userId, userRole, data.sessionId);
    return this.prisma.material.create({ data });
  }

  async remove(id: string, userId: string, userRole: Role) {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) throw new NotFoundException('Material topilmadi');

    await this.assertCanManageSession(userId, userRole, material.sessionId);

    // Diskdan ham o'chirib qo'yish
    if (material.fileUrl?.startsWith('/uploads/')) {
      const fullPath = path.join(process.cwd(), material.fileUrl);
      fs.promises.unlink(fullPath).catch(() => null);
    }

    await this.prisma.material.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Foydalanuvchi sessiya uchun material boshqarishi mumkinmi tekshiradi.
   * Ruxsat: ADMIN | sessiya speakeri | konferensiya organizeri.
   */
  private async assertCanManageSession(
    userId: string,
    userRole: Role,
    sessionId: string,
  ) {
    if (userRole === Role.ADMIN) return;

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        speakerId: true,
        conference: { select: { organizerId: true } },
      },
    });

    if (!session) {
      throw new NotFoundException('Sessiya topilmadi');
    }

    const isSpeaker = session.speakerId === userId;
    const isOrganizer = session.conference.organizerId === userId;

    if (!isSpeaker && !isOrganizer) {
      throw new ForbiddenException(
        "Faqat sessiya ma'ruzachisi yoki konferensiya tashkilotchisi material yuklay oladi",
      );
    }
  }
}
