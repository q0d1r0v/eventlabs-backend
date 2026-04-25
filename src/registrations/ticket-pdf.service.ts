import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';

export interface TicketData {
  ticketCode: string;
  userName: string;
  userEmail: string;
  conferenceTitle: string;
  conferenceStartDate: Date;
  conferenceEndDate: Date;
  location: string;
  isOnline: boolean;
  category?: string | null;
}

const BRAND_GREEN = '#18E299';
const BRAND_DEEP = '#0FA76E';
const BRAND_LIGHT = '#D4FAE8';
const TEXT = '#0D0D0D';
const TEXT_MUTED = '#666666';
const BORDER_SUBTLE = '#E5E5E5';
const BG_SUBTLE = '#FAFAFA';

@Injectable()
export class TicketPdfService {
  private readonly logger = new Logger(TicketPdfService.name);
  private readonly uploadDir: string;
  private readonly frontendUrl: string;

  constructor(config: ConfigService) {
    const root = config.get<string>('uploadDir') ?? './uploads';
    this.uploadDir = path.resolve(root, 'tickets');
    this.frontendUrl =
      config.get<string>('frontendUrl') ?? 'http://localhost:5173';
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async generate(data: TicketData): Promise<string> {
    const filename = `${data.ticketCode}.pdf`;
    const fullPath = path.join(this.uploadDir, filename);

    // Verify URL via deep-link to ticket details (or registration page)
    const verifyUrl = `${this.frontendUrl}/tickets/${data.ticketCode}`;

    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 220,
      margin: 0,
      color: { dark: TEXT, light: '#ffffff' },
    });
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    await new Promise<void>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A5',
          layout: 'landscape',
          margins: { top: 0, left: 0, right: 0, bottom: 0 },
          info: {
            Title: `EventLab Chipta - ${data.ticketCode}`,
            Author: 'EventLab',
            Subject: data.conferenceTitle,
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

    this.logger.log(`Ticket PDF saved: ${filename}`);
    return `/uploads/tickets/${filename}`;
  }

  private draw(doc: PDFKit.PDFDocument, data: TicketData, qrBuffer: Buffer) {
    // A5 landscape: 595 × 420 pt
    const W = 595;
    const H = 420;
    const stubWidth = 180; // o'ng tomondagi yorliq qismi

    // Background
    doc.rect(0, 0, W, H).fill('#ffffff');

    // Outer rounded frame
    doc
      .strokeColor(BORDER_SUBTLE)
      .lineWidth(1)
      .roundedRect(20, 20, W - 40, H - 40, 12)
      .stroke();

    // Top accent bar
    doc.save();
    doc.roundedRect(20, 20, W - 40, 8, 4).fill(BRAND_GREEN);
    doc.restore();

    // Right stub background (ticket tear-off look)
    const stubX = W - stubWidth - 20;
    doc.save();
    doc.rect(stubX, 28, stubWidth, H - 48).fill(BG_SUBTLE);
    doc.restore();

    // Dashed perforation between main body and stub
    doc.save();
    doc.dash(4, { space: 4 });
    doc
      .strokeColor(BORDER_SUBTLE)
      .lineWidth(1)
      .moveTo(stubX, 32)
      .lineTo(stubX, H - 24)
      .stroke();
    doc.undash();
    doc.restore();

    // ── LEFT MAIN PART ─────────────────────────────
    const leftX = 40;
    let y = 50;

    // Brand
    this.drawLogo(doc, leftX, y);
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(TEXT)
      .text('EventLab', leftX + 28, y + 3);
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor(TEXT_MUTED)
      .text('KONFERENSIYA CHIPTASI', leftX + 28, y + 17, {
        characterSpacing: 1,
      });

    // Category badge (top right of main area)
    if (data.category) {
      doc.font('Helvetica-Bold').fontSize(8);
      const badgeText = data.category.toUpperCase();
      const textWidth = doc.widthOfString(badgeText, {
        characterSpacing: 0.6,
      });
      const badgeWidth = Math.min(textWidth + 16, stubX - leftX - 100);
      const badgeX = stubX - badgeWidth - 12;
      doc.roundedRect(badgeX, y + 2, badgeWidth, 18, 9).fill(BRAND_LIGHT);
      doc.fillColor(BRAND_DEEP).text(badgeText, badgeX, y + 7, {
        width: badgeWidth,
        align: 'center',
        characterSpacing: 0.6,
        ellipsis: true,
        lineBreak: false,
      });
    }

    y += 50;

    // Section label
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(BRAND_DEEP)
      .text('KONFERENSIYA', leftX, y, { characterSpacing: 1.2 });

    y += 14;

    // Conference title (wraps)
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor(TEXT)
      .text(data.conferenceTitle, leftX, y, {
        width: stubX - leftX - 30,
        ellipsis: true,
        height: 60,
      });

    y += 70;

    // Date row
    this.drawIconRow(
      doc,
      leftX,
      y,
      'calendar',
      this.formatRange(data.conferenceStartDate, data.conferenceEndDate),
    );
    y += 22;

    // Location row
    this.drawIconRow(
      doc,
      leftX,
      y,
      'pin',
      data.isOnline ? 'Onlayn' : data.location,
    );
    y += 32;

    // Divider
    doc
      .strokeColor(BORDER_SUBTLE)
      .lineWidth(0.5)
      .moveTo(leftX, y)
      .lineTo(stubX - 20, y)
      .stroke();

    y += 14;

    // Holder
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(TEXT_MUTED)
      .text('CHIPTA EGASI', leftX, y, { characterSpacing: 1.2 });

    y += 12;

    doc
      .font('Helvetica-Bold')
      .fontSize(15)
      .fillColor(TEXT)
      .text(data.userName, leftX, y, {
        width: stubX - leftX - 30,
        ellipsis: true,
      });

    y += 18;

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(TEXT_MUTED)
      .text(data.userEmail, leftX, y, {
        width: stubX - leftX - 30,
        ellipsis: true,
      });

    // ── RIGHT STUB ──────────────────────────────────
    const stubInnerX = stubX + 16;
    const stubInnerW = stubWidth - 32;

    // QR Code
    const qrSize = 110;
    const qrX = stubX + (stubWidth - qrSize) / 2;
    const qrY = 60;
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

    // QR label
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor(TEXT_MUTED)
      .text('KIRISH UCHUN SKAN QILING', stubX, qrY + qrSize + 8, {
        width: stubWidth,
        align: 'center',
        characterSpacing: 1,
      });

    // Stub divider (small dashed line)
    doc.save();
    doc.dash(2, { space: 3 });
    doc
      .strokeColor(BORDER_SUBTLE)
      .lineWidth(0.5)
      .moveTo(stubInnerX, qrY + qrSize + 30)
      .lineTo(stubInnerX + stubInnerW, qrY + qrSize + 30)
      .stroke();
    doc.undash();
    doc.restore();

    // Ticket code label
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(TEXT_MUTED)
      .text('CHIPTA KODI', stubX, qrY + qrSize + 42, {
        width: stubWidth,
        align: 'center',
        characterSpacing: 1.2,
      });

    // Ticket code (short)
    const shortCode = data.ticketCode.slice(0, 8).toUpperCase();
    doc
      .font('Courier-Bold')
      .fontSize(18)
      .fillColor(TEXT)
      .text(shortCode, stubX, qrY + qrSize + 56, {
        width: stubWidth,
        align: 'center',
        characterSpacing: 2,
      });

    // Full code (small)
    doc
      .font('Courier')
      .fontSize(6)
      .fillColor(TEXT_MUTED)
      .text(data.ticketCode, stubX, qrY + qrSize + 82, {
        width: stubWidth,
        align: 'center',
      });

    // Footer info on bottom of stub
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor(TEXT_MUTED)
      .text('eventlab.uz', stubX, H - 38, {
        width: stubWidth,
        align: 'center',
        characterSpacing: 0.6,
      });
  }

  private drawLogo(doc: PDFKit.PDFDocument, x: number, y: number) {
    const size = 22;
    doc.roundedRect(x, y, size, size, 5).fill(TEXT);
    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor(BRAND_GREEN)
      .text('E', x + 6, y + 5);
  }

  private drawIconRow(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    icon: 'calendar' | 'pin',
    text: string,
  ) {
    // Icon background (rounded square)
    doc.save();
    doc.roundedRect(x, y, 22, 22, 6).fill(BRAND_LIGHT);
    doc.restore();

    // Icon glyph (vector)
    if (icon === 'calendar') {
      this.drawCalendarIcon(doc, x + 5, y + 5, 12);
    } else {
      this.drawPinIcon(doc, x + 5, y + 4, 12);
    }

    // Text
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(TEXT)
      .text(text, x + 32, y + 6);
  }

  /** Calendar icon — 12×12 size at given top-left */
  private drawCalendarIcon(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    s: number,
  ) {
    doc.save();
    doc.lineWidth(1).strokeColor(BRAND_DEEP);
    // Body of calendar
    doc.roundedRect(x, y + 2, s, s - 2, 1.5).stroke();
    // Top header line
    doc
      .moveTo(x, y + 5)
      .lineTo(x + s, y + 5)
      .stroke();
    // Tick marks (legs)
    doc
      .moveTo(x + 3, y)
      .lineTo(x + 3, y + 4)
      .stroke();
    doc
      .moveTo(x + s - 3, y)
      .lineTo(x + s - 3, y + 4)
      .stroke();
    doc.restore();
  }

  /** Map pin icon — width s at given top-left */
  private drawPinIcon(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    s: number,
  ) {
    doc.save();

    const cx = x + s / 2;
    const top = y;
    const bottom = y + s + 1;
    const r = s / 2;

    // Pin body — bezier teardrop shape
    doc
      .path(
        `M ${cx} ${bottom} ` +
          `C ${x - 1} ${y + r * 1.5}, ${x - 1} ${top + r * 0.5}, ${cx} ${top} ` +
          `C ${x + s + 1} ${top + r * 0.5}, ${x + s + 1} ${y + r * 1.5}, ${cx} ${bottom} ` +
          `Z`,
      )
      .fillColor(BRAND_DEEP)
      .fill();

    // Inner circle
    doc
      .circle(cx, top + r, r * 0.4)
      .fillColor(BRAND_LIGHT)
      .fill();

    doc.restore();
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
