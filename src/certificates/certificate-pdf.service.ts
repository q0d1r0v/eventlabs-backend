import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';

export interface CertificateData {
  code: string;
  userName: string;
  conferenceTitle: string;
  conferenceStartDate: Date;
  conferenceEndDate: Date;
  organizerName?: string;
  issuedAt: Date;
}

const BRAND_GREEN = '#18E299';
const BRAND_DEEP = '#0FA76E';
const TEXT = '#0D0D0D';
const TEXT_MUTED = '#666666';
const BORDER_SUBTLE = '#E5E5E5';

@Injectable()
export class CertificatePdfService {
  private readonly logger = new Logger(CertificatePdfService.name);
  private readonly uploadDir: string;
  private readonly frontendUrl: string;

  constructor(config: ConfigService) {
    const root = config.get<string>('uploadDir') ?? './uploads';
    this.uploadDir = path.resolve(root, 'certificates');
    this.frontendUrl =
      config.get<string>('frontendUrl') ?? 'http://localhost:5173';
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  /**
   * Sertifikat uchun PDF yaratadi va `/uploads/certificates/{code}.pdf` ga
   * saqlaydi. Static fayl URL'i qaytaradi (relativ).
   */
  async generate(data: CertificateData): Promise<string> {
    const filename = `${data.code}.pdf`;
    const fullPath = path.join(this.uploadDir, filename);
    const verifyUrl = `${this.frontendUrl}/certificates/${data.code}`;

    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 220,
      margin: 0,
      color: { dark: TEXT, light: '#ffffff' },
    });
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    await new Promise<void>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: { top: 0, left: 0, right: 0, bottom: 0 },
          info: {
            Title: `EventLab Sertifikat - ${data.code}`,
            Author: 'EventLab',
            Subject: data.conferenceTitle,
            CreationDate: data.issuedAt,
          },
        });

        const stream = fs.createWriteStream(fullPath);
        doc.pipe(stream);
        stream.on('finish', () => resolve());
        stream.on('error', reject);

        this.draw(doc, data, qrBuffer);
        doc.end();
      } catch (err) {
        reject(err);
      }
    });

    this.logger.log(`Certificate PDF saved: ${filename}`);
    return `/uploads/certificates/${filename}`;
  }

  private draw(
    doc: PDFKit.PDFDocument,
    data: CertificateData,
    qrBuffer: Buffer,
  ) {
    // A4 landscape: 842 × 595 pt
    const W = 842;
    const H = 595;

    // Background
    doc.rect(0, 0, W, H).fill('#ffffff');

    // Top accent bar
    doc.rect(0, 0, W, 8).fill(BRAND_GREEN);

    // Decorative side bands
    doc.rect(0, 0, 60, H).fill('#FAFAFA');
    doc.rect(W - 60, 0, 60, H).fill('#FAFAFA');

    // Inner frame
    doc
      .strokeColor(BORDER_SUBTLE)
      .lineWidth(1)
      .roundedRect(40, 40, W - 80, H - 80, 8)
      .stroke();

    doc
      .strokeColor(BRAND_GREEN)
      .lineWidth(2)
      .roundedRect(50, 50, W - 100, H - 100, 6)
      .stroke();

    // Logo + brand
    this.drawLogo(doc, 80, 80);
    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor(TEXT)
      .text('EventLab', 110, 86);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(TEXT_MUTED)
      .text('KONFERENSIYA PLATFORMASI', 110, 103, { characterSpacing: 1.2 });

    // Certificate ID badge (top-right)
    const badgeText = `№ ${data.code.slice(0, 8).toUpperCase()}`;
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(TEXT_MUTED)
      .text(badgeText, W - 200, 90, { width: 120, align: 'right' });

    // Big "SERTIFIKAT" title
    doc
      .font('Helvetica-Bold')
      .fontSize(36)
      .fillColor(TEXT)
      .text('SERTIFIKAT', 0, 150, {
        width: W,
        align: 'center',
        characterSpacing: 6,
      });

    // Decorative underline
    const lineY = 200;
    doc
      .moveTo(W / 2 - 60, lineY)
      .lineTo(W / 2 - 10, lineY)
      .lineWidth(2)
      .strokeColor(BRAND_GREEN)
      .stroke();
    doc.circle(W / 2, lineY, 3).fill(BRAND_GREEN);
    doc
      .moveTo(W / 2 + 10, lineY)
      .lineTo(W / 2 + 60, lineY)
      .lineWidth(2)
      .strokeColor(BRAND_GREEN)
      .stroke();

    // Subtitle
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(TEXT_MUTED)
      .text('USHBU SERTIFIKAT', 0, 220, {
        width: W,
        align: 'center',
        characterSpacing: 2,
      });

    // User name (big)
    doc
      .font('Helvetica-Bold')
      .fontSize(34)
      .fillColor(BRAND_DEEP)
      .text(data.userName.toUpperCase(), 100, 250, {
        width: W - 200,
        align: 'center',
      });

    // Connecting text
    doc
      .font('Helvetica')
      .fontSize(13)
      .fillColor(TEXT)
      .text(
        'quyidagi konferensiyada muvaffaqiyatli ishtirok etganligi uchun beriladi:',
        0,
        310,
        {
          width: W,
          align: 'center',
        },
      );

    // Conference name
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor(TEXT)
      .text(`«${data.conferenceTitle}»`, 80, 340, {
        width: W - 160,
        align: 'center',
      });

    // Conference dates
    const dateRange = this.formatRange(
      data.conferenceStartDate,
      data.conferenceEndDate,
    );
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(TEXT_MUTED)
      .text(dateRange, 0, 380, { width: W, align: 'center' });

    // Bottom row: signature (left), QR (right)
    const bottomY = 440;

    // Signature
    doc
      .moveTo(120, bottomY + 30)
      .lineTo(280, bottomY + 30)
      .lineWidth(1)
      .strokeColor(TEXT)
      .stroke();
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(TEXT)
      .text(data.organizerName ?? 'Tashkilotchi', 120, bottomY + 36, {
        width: 160,
        align: 'center',
      });
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(TEXT_MUTED)
      .text('TASHKILOTCHI', 120, bottomY + 54, {
        width: 160,
        align: 'center',
        characterSpacing: 1.2,
      });

    // Issue date — middle
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(TEXT)
      .text(this.formatDate(data.issuedAt), 0, bottomY + 36, {
        width: W,
        align: 'center',
      });
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(TEXT_MUTED)
      .text('BERILGAN SANA', 0, bottomY + 54, {
        width: W,
        align: 'center',
        characterSpacing: 1.2,
      });
    doc
      .moveTo(W / 2 - 80, bottomY + 30)
      .lineTo(W / 2 + 80, bottomY + 30)
      .lineWidth(1)
      .strokeColor(TEXT)
      .stroke();

    // QR
    const qrSize = 70;
    const qrX = W - 80 - qrSize;
    const qrY = bottomY - 5;
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor(TEXT_MUTED)
      .text('TEKSHIRISH', qrX, qrY + qrSize + 4, {
        width: qrSize,
        align: 'center',
        characterSpacing: 1.2,
      });

    // Footer code
    doc
      .font('Courier')
      .fontSize(8)
      .fillColor(TEXT_MUTED)
      .text(`Kod: ${data.code}`, 0, H - 35, {
        width: W,
        align: 'center',
      });
  }

  private drawLogo(doc: PDFKit.PDFDocument, x: number, y: number) {
    const size = 20;
    doc.roundedRect(x, y, size, size, 4).fill(TEXT);
    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor(BRAND_GREEN)
      .text('E', x + 6, y + 4);
  }

  private formatDate(d: Date): string {
    const months = [
      'yanvar',
      'fevral',
      'mart',
      'aprel',
      'may',
      'iyun',
      'iyul',
      'avgust',
      'sentabr',
      'oktabr',
      'noyabr',
      'dekabr',
    ];
    return `${d.getDate()}-${months[d.getMonth()]}, ${d.getFullYear()}`;
  }

  private formatRange(start: Date, end: Date): string {
    const sameDay =
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate();
    if (sameDay) return this.formatDate(start);
    return `${this.formatDate(start)} — ${this.formatDate(end)}`;
  }
}
