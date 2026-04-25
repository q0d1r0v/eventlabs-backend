import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Tozalash (rivojlanish uchun)
  await prisma.feedback.deleteMany();
  await prisma.material.deleteMany();
  await prisma.question.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.session.deleteMany();
  await prisma.conference.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash('Password123!', 12);

  // Foydalanuvchilar
  const admin = await prisma.user.create({
    data: {
      email: 'admin@eventlab.uz',
      password,
      name: 'Tizim Administrator',
      role: 'ADMIN',
      isVerified: true,
    },
  });

  const organizer = await prisma.user.create({
    data: {
      email: 'organizer@eventlab.uz',
      password,
      name: 'Bexruz Abduxoliqov',
      role: 'ORGANIZER',
      isVerified: true,
      bio: 'Konferensiya tashkilotchisi',
    },
  });

  const speaker = await prisma.user.create({
    data: {
      email: 'speaker@eventlab.uz',
      password,
      name: 'Dilshod Karimov',
      role: 'SPEAKER',
      isVerified: true,
      bio: 'Senior Software Engineer, 10+ yillik tajriba',
    },
  });

  const participant = await prisma.user.create({
    data: {
      email: 'user@eventlab.uz',
      password,
      name: 'Test Foydalanuvchi',
      role: 'PARTICIPANT',
      isVerified: true,
    },
  });

  // Konferensiyalar
  const conf1 = await prisma.conference.create({
    data: {
      title: 'Vue.js O‘zbekiston Konferensiyasi 2026',
      description:
        'Vue.js, TypeScript va zamonaviy frontend texnologiyalari haqida kunlik tadbir. Mahalliy va xalqaro ma‘ruzachilar, real loyihalardan keyslar va networking imkoniyati.',
      startDate: new Date('2026-06-15T09:00:00Z'),
      endDate: new Date('2026-06-16T18:00:00Z'),
      location: 'Toshkent, IT Park',
      isOnline: false,
      category: 'Frontend Development',
      status: 'PUBLISHED',
      maxAttendees: 300,
      organizerId: organizer.id,
    },
  });

  const conf2 = await prisma.conference.create({
    data: {
      title: 'AI & Machine Learning Summit',
      description:
        'Sun‘iy intellekt va mashinaviy o‘rganish bo‘yicha onlayn summit. LLM, computer vision, MLOps mavzularida tadqiqotlar.',
      startDate: new Date('2026-07-20T10:00:00Z'),
      endDate: new Date('2026-07-21T17:00:00Z'),
      location: 'Online (Zoom)',
      isOnline: true,
      category: 'AI/ML',
      status: 'PUBLISHED',
      maxAttendees: 1000,
      organizerId: organizer.id,
    },
  });

  await prisma.conference.create({
    data: {
      title: 'Backend Engineering Workshop',
      description:
        'NestJS, Prisma va PostgreSQL bilan ishlash bo‘yicha amaliy workshop.',
      startDate: new Date('2026-08-10T09:00:00Z'),
      endDate: new Date('2026-08-10T18:00:00Z'),
      location: 'Samarqand, Texnopark',
      isOnline: false,
      category: 'Backend Development',
      status: 'DRAFT',
      maxAttendees: 50,
      organizerId: organizer.id,
    },
  });

  // Sessiyalar
  await prisma.session.createMany({
    data: [
      {
        conferenceId: conf1.id,
        title: 'Vue 3 Composition API: chuqur tahlil',
        description:
          'Composition API’ning ichki ishlash mexanizmlari va eng yaxshi amaliyotlar.',
        startTime: new Date('2026-06-15T10:00:00Z'),
        endTime: new Date('2026-06-15T11:00:00Z'),
        room: 'A-101',
        speakerId: speaker.id,
      },
      {
        conferenceId: conf1.id,
        title: 'Pinia vs Vuex: zamonaviy state management',
        description: 'Pinia’ga o‘tish sabablari va migratsiya strategiyalari.',
        startTime: new Date('2026-06-15T11:30:00Z'),
        endTime: new Date('2026-06-15T12:30:00Z'),
        room: 'A-101',
      },
      {
        conferenceId: conf1.id,
        title: 'TypeScript & Vue: type-safe komponentlar',
        description: 'TS bilan Vue komponentlarini xavfsiz qilish.',
        startTime: new Date('2026-06-15T14:00:00Z'),
        endTime: new Date('2026-06-15T15:00:00Z'),
        room: 'A-102',
      },
      {
        conferenceId: conf2.id,
        title: 'LLM’lar bilan ishlash: prompt engineering',
        description: 'Katta til modellarida prompt engineering texnikalari.',
        startTime: new Date('2026-07-20T11:00:00Z'),
        endTime: new Date('2026-07-20T12:30:00Z'),
        virtualLink: 'https://zoom.us/j/example',
        speakerId: speaker.id,
      },
    ],
  });

  // Test ro‘yxatdan o‘tish
  await prisma.registration.create({
    data: {
      userId: participant.id,
      conferenceId: conf1.id,
      status: 'CONFIRMED',
      ticketCode: 'TICKET-DEMO-001',
    },
  });

  // Test bildirishnoma
  await prisma.notification.create({
    data: {
      userId: participant.id,
      type: 'CONFERENCE',
      title: 'Konferensiya yaqinlashmoqda',
      message: 'Vue.js O‘zbekiston Konferensiyasi 1 hafta ichida boshlanadi.',
    },
  });

  console.log('✅ Seed muvaffaqiyatli yakunlandi!');
  console.log('');
  console.log('🔑 Test foydalanuvchilar (parol: Password123!):');
  console.log('   admin@eventlab.uz       — ADMIN');
  console.log('   organizer@eventlab.uz   — ORGANIZER');
  console.log('   speaker@eventlab.uz     — SPEAKER');
  console.log('   user@eventlab.uz        — PARTICIPANT');
}

main()
  .catch((e) => {
    console.error('❌ Seed xatolik:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
