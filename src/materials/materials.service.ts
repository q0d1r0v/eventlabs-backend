import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  findBySession(sessionId: string) {
    return this.prisma.material.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: {
    sessionId: string;
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }) {
    return this.prisma.material.create({ data });
  }

  async remove(id: string) {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) throw new NotFoundException('Material topilmadi');
    await this.prisma.material.delete({ where: { id } });
    return { success: true };
  }
}
