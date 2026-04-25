import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const PUBLIC_FIELDS = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatar: true,
  bio: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: PUBLIC_FIELDS,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_FIELDS,
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    return user;
  }

  async findByRole(role: Role) {
    return this.prisma.user.findMany({
      where: { role },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) {
      throw new ConflictException('Bu email allaqachon ishlatilgan');
    }

    const hashed = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashed,
        role: dto.role ?? Role.PARTICIPANT,
        bio: dto.bio,
        isVerified: true,
      },
      select: PUBLIC_FIELDS,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Foydalanuvchi topilmadi');

    if (dto.email && dto.email !== exists.email) {
      const taken = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (taken) {
        throw new ConflictException('Bu email allaqachon ishlatilgan');
      }
    }

    const data: {
      email?: string;
      name?: string;
      role?: Role;
      bio?: string;
      isVerified?: boolean;
      password?: string;
    } = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.isVerified !== undefined) data.isVerified = dto.isVerified;
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 12);
      // Parol o'zgarganda barcha refresh tokenlarni bekor qilamiz
      await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: PUBLIC_FIELDS,
    });
  }

  async setAvatar(id: string, avatarUrl: string | null) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    // Eski avatarni diskdan tozalash
    if (user.avatar && user.avatar !== avatarUrl) {
      this.removeUploadFile(user.avatar);
    }

    return this.prisma.user.update({
      where: { id },
      data: { avatar: avatarUrl },
      select: PUBLIC_FIELDS,
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

  async remove(id: string) {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Foydalanuvchi topilmadi');
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }
}
