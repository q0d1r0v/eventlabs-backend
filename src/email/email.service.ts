import { Injectable, Logger } from '@nestjs/common';

/**
 * Sodda email "service" — pullik SMTP kerak emas.
 * Productionda nodemailer transport bilan almashtirilishi mumkin.
 * Hozir email matni faqat console'ga loglanadi (dev rejim).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger('Email');

  send(to: string, subject: string, body: string) {
    this.logger.log(`📧 To: ${to}`);
    this.logger.log(`   Subject: ${subject}`);
    this.logger.log(`   Body: ${body.replace(/\n/g, ' ').slice(0, 120)}...`);
    return { sent: true, to, subject };
  }

  sendVerification(to: string, code: string) {
    return this.send(
      to,
      'EventLab.uz — Email tasdiqlash',
      `Salom! Email manzilingizni tasdiqlash uchun kod: ${code}`,
    );
  }

  sendTicket(to: string, conferenceTitle: string, ticketCode: string) {
    return this.send(
      to,
      `EventLab.uz — Chipta: ${conferenceTitle}`,
      `Tabriklaymiz! Siz "${conferenceTitle}" konferensiyasiga ro'yxatdan o'tdingiz.\nChipta kodingiz: ${ticketCode}`,
    );
  }

  sendCertificate(
    to: string,
    conferenceTitle: string,
    certificateCode: string,
  ) {
    return this.send(
      to,
      `EventLab.uz — Sertifikat: ${conferenceTitle}`,
      `Tabriklaymiz! Sertifikatingiz tayyor.\nKod: ${certificateCode}`,
    );
  }
}
