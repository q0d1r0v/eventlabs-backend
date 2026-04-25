import { ConferenceStatus, Prisma } from '@prisma/client';

interface ConferenceTimeBlock {
  status: ConferenceStatus;
  startDate: Date;
  endDate: Date;
}

/**
 * Konferensiya holati ikki manbadan keladi:
 *   - Manual: organizer qo'lda qo'yadi (DRAFT, PUBLISHED, CANCELLED)
 *   - Avtomatik: sana asosida hisoblanadi (ONGOING, FINISHED)
 *
 * Bu helper DBdagi `status` maydoni va sana asosida haqiqiy holat qaytaradi.
 */
export function computeEffectiveStatus<T extends ConferenceTimeBlock>(
  conf: T,
  now: Date = new Date(),
): ConferenceStatus {
  // Qo'lda qo'yilgan holatlar avtomatika bilan o'zgarmaydi
  if (conf.status === 'DRAFT' || conf.status === 'CANCELLED') {
    return conf.status;
  }

  const t = now.getTime();
  const start = conf.startDate.getTime();
  const end = conf.endDate.getTime();

  if (t >= end) return 'FINISHED';
  if (t >= start && t < end) return 'ONGOING';
  return 'PUBLISHED';
}

/**
 * Konferensiya ob'ektining `status` maydonini hisoblangan holat bilan
 * almashtiradi. DBga yozmaydi — faqat javobni boyitadi.
 */
export function withEffectiveStatus<T extends ConferenceTimeBlock>(
  conf: T,
  now: Date = new Date(),
): T {
  return { ...conf, status: computeEffectiveStatus(conf, now) };
}

/**
 * Foydalanuvchi `?status=...` filtri bilan so'raganda, hisoblanadigan
 * holatlarni Prisma where shartiga aylantiradi.
 *
 * Qaytariladi: Prisma whereInput uchun qo'shiladigan obyekt yoki null
 * (filtr yo'q bo'lsa).
 */
export function buildStatusWhere(
  status: ConferenceStatus | undefined,
  now: Date = new Date(),
): Prisma.ConferenceWhereInput | null {
  if (!status) return null;

  // DRAFT va CANCELLED qo'lda boshqariladi — DBdagi qiymatga aniq moslash
  if (status === 'DRAFT' || status === 'CANCELLED') {
    return { status };
  }

  // PUBLISHED/ONGOING/FINISHED hisoblanadi — DBda DRAFT/CANCELLED bo'lmasligi
  // shart, qolgan farq sana asosida.
  const notManual: Prisma.ConferenceWhereInput['status'] = {
    notIn: ['DRAFT', 'CANCELLED'],
  };

  // PUBLISHED — hali boshlanmagan
  if (status === 'PUBLISHED') {
    return { status: notManual, startDate: { gt: now } };
  }

  // ONGOING — boshlanish vaqti keldi, tugash vaqti hali kelmagan
  if (status === 'ONGOING') {
    return {
      status: notManual,
      startDate: { lte: now },
      endDate: { gt: now },
    };
  }

  // FINISHED — tugash vaqti o'tgan
  if (status === 'FINISHED') {
    return { status: notManual, endDate: { lte: now } };
  }

  return { status };
}
