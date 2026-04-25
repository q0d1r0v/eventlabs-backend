# EventLab.uz — Backend

Konferensiyalarni rejalashtirish va boshqarish tizimining backend qismi. NestJS,
Prisma va Socket.IO asosida qurilgan REST API + real-time WebSocket xizmati.

---

## Mundarija

1. [Texnologiyalar](#texnologiyalar)
2. [Talablar](#talablar)
3. [Tezkor ishga tushirish](#tezkor-ishga-tushirish)
4. [Muhit o'zgaruvchilari (.env)](#muhit-ozgaruvchilari-env)
5. [Test foydalanuvchilar](#test-foydalanuvchilar)
6. [Foydali komandalar](#foydali-komandalar)
7. [Loyiha tuzilmasi](#loyiha-tuzilmasi)
8. [Ma'lumotlar bazasi modellari](#malumotlar-bazasi-modellari)
9. [Autentifikatsiya va rollar](#autentifikatsiya-va-rollar)
10. [API endpointlari](#api-endpointlari)
11. [Fayl yuklash (uploads)](#fayl-yuklash-uploads)
12. [Socket.IO real-time qatlam](#socketio-real-time-qatlam)
13. [Email xizmati](#email-xizmati)
14. [Sertifikat (PDF + QR)](#sertifikat-pdf--qr)
15. [Xavfsizlik](#xavfsizlik)
16. [Testlash](#testlash)
17. [Production deploy](#production-deploy)

---

## Texnologiyalar

| Toifa | Texnologiya |
|-------|-------------|
| Freymvork | **NestJS 11** (Express platforma) |
| Til | **TypeScript 5.7** |
| ORM | **Prisma 7** |
| MB | **PostgreSQL 14+** |
| Real-time | **Socket.IO 4** (`@nestjs/websockets`) |
| Auth | **JWT** (access + refresh) + **Passport** |
| Validatsiya | `class-validator`, `class-transformer`, `ValidationPipe` |
| Xavfsizlik | `helmet`, `@nestjs/throttler`, `bcrypt` |
| Hujjat | `@nestjs/swagger` (OpenAPI 3) |
| Fayllar | `multer` + `sharp` (rasm optimallashtirish) |
| PDF / QR | `pdfkit` + `qrcode` |
| Email | `nodemailer` (dev rejimda console log) |

---

## Talablar

- **Node.js** ≥ 20
- **Yarn** ≥ 1.22 (yoki `npm`)
- **PostgreSQL** ≥ 14 (mahalliy yoki Docker'da)

---

## Tezkor ishga tushirish

### 1. PostgreSQL bazasini yarating

```bash
PGPASSWORD=YOUR_PASSWORD psql -h localhost -U postgres -c "CREATE DATABASE eventlab;"
```

### 2. `.env` faylini sozlang

`.env.example`'ni `.env`'ga ko'chiring va `DATABASE_URL`'ni o'zingiznikiga moslang:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/eventlab"
```

To'liq ro'yxat — quyida [Muhit o'zgaruvchilari](#muhit-ozgaruvchilari-env) bo'limida.

### 3. Bog'liqliklarni o'rnating

```bash
yarn install
```

### 4. Ma'lumotlar bazasini tayyorlang

```bash
yarn db:migrate     # schema → DB (migration ishga tushiradi)
yarn db:seed        # test ma'lumotlar
```

### 5. Serverni ishga tushiring

```bash
yarn start:dev
```

| Manzil | Maqsad |
|--------|--------|
| `http://localhost:3000/api` | REST API root |
| `http://localhost:3000/docs` | Swagger UI (interaktiv hujjat) |
| `http://localhost:3000/uploads/...` | Statik fayllar (rasm, hujjat, PDF) |
| `ws://localhost:3000` | Socket.IO endpoint |

---

## Muhit o'zgaruvchilari (.env)

| O'zgaruvchi | Standart | Tavsif |
|-------------|----------|--------|
| `NODE_ENV` | `development` | `development` / `production` |
| `PORT` | `3000` | HTTP port |
| `API_PREFIX` | `api` | Barcha endpointlar uchun prefiks |
| `FRONTEND_URL` | `http://localhost:5173` | CORS uchun ruxsat etilgan origin |
| `DATABASE_URL` | — | PostgreSQL ulanish satri (majburiy) |
| `JWT_ACCESS_SECRET` | `dev-access-secret` | Access token uchun maxfiy kalit |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Access token muddati |
| `JWT_REFRESH_SECRET` | `dev-refresh-secret` | Refresh token uchun maxfiy kalit |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token muddati |
| `SMTP_HOST` | — | SMTP server (productionda) |
| `SMTP_PORT` | `587` | SMTP porti |
| `SMTP_USER` | — | SMTP login |
| `SMTP_PASS` | — | SMTP parol |
| `SMTP_FROM` | `EventLab.uz <noreply@eventlab.uz>` | Email "From" |
| `UPLOAD_DIR` | `./uploads` | Yuklangan fayllar papkasi |
| `MAX_FILE_SIZE` | `10485760` (10 MB) | Maksimal fayl hajmi (bayt) |
| `THROTTLE_TTL` | `60` | Rate-limit oynasi (soniya) |
| `THROTTLE_LIMIT` | `100` | Oynadagi maksimal so'rovlar |

> Productionda **JWT secret'larni majburiy almashtiring** va kuchli random qiymat ishlating.

---

## Test foydalanuvchilar

`yarn db:seed` dan keyin (parol hammasi: **`Password123!`**):

| Email | Rol |
|-------|-----|
| `admin@eventlab.uz` | `ADMIN` |
| `organizer@eventlab.uz` | `ORGANIZER` |
| `speaker@eventlab.uz` | `SPEAKER` |
| `user@eventlab.uz` | `PARTICIPANT` |

---

## Foydali komandalar

```bash
# Ishlab chiqish
yarn start:dev          # watch rejimida (har o'zgarishda restart)
yarn start:debug        # --inspect bilan debugger

# Production
yarn build              # dist/ ga kompilyatsiya
yarn start:prod         # node dist/main

# Database
yarn db:generate        # Prisma Client'ni qayta generatsiya qilish
yarn db:migrate         # yangi migration yaratish va qo'llash
yarn db:push            # schema'ni migration'siz to'g'ridan-to'g'ri qo'llash
yarn db:seed            # test ma'lumotlarni yuklash
yarn db:studio          # Prisma Studio GUI (brauzer orqali ko'rish)
yarn db:reset           # DB'ni tozalab qayta yaratish (DIQQAT: barcha ma'lumot o'chadi)

# Sifat
yarn lint               # ESLint
yarn format             # Prettier
yarn test               # unit testlar
yarn test:cov           # coverage hisoboti bilan
yarn test:e2e           # end-to-end testlar
```

---

## Loyiha tuzilmasi

```
eventlab-backend/
├── prisma/
│   ├── schema.prisma         # Ma'lumotlar bazasi sxemasi
│   ├── migrations/           # Migration tarixi
│   └── seed.ts               # Test ma'lumotlar
├── src/
│   ├── auth/                 # JWT, register/login/refresh/logout
│   ├── users/                # Foydalanuvchilar, avatar yuklash
│   ├── conferences/          # Konferensiya CRUD + banner yuklash
│   ├── sessions/             # Sessiyalar (ma'ruzalar) CRUD
│   ├── registrations/        # Yozilish + ticket QR + ticket PDF
│   ├── questions/            # Q&A (savol/javob, upvote)
│   ├── notifications/        # Bildirishnomalar
│   ├── materials/            # Fayl yuklash (taqdimot, hujjat)
│   ├── certificates/         # Sertifikat (PDF + QR + verify)
│   ├── feedback/             # Sessiya bahosi (1–5 yulduz)
│   ├── gateway/              # Socket.IO (events.gateway.ts)
│   ├── email/                # Email xizmati (dev: console)
│   ├── prisma/               # PrismaService
│   ├── common/               # decorators, guards, filters, interceptors
│   ├── config/               # Konfiguratsiya
│   ├── uploads/              # MulterModule, storage konfiguratsiyasi
│   ├── app.module.ts         # Root modul
│   └── main.ts               # bootstrap (helmet, CORS, Swagger)
├── uploads/                  # Yuklangan fayllar (gitga qo'shilmaydi)
├── test/                     # E2E testlar
├── nest-cli.json
├── tsconfig.json
└── package.json
```

---

## Ma'lumotlar bazasi modellari

Prisma sxemasi 9 ta asosiy modeldan iborat:

| Model | Tavsif |
|-------|--------|
| `User` | Foydalanuvchi (rol, parol, profil) |
| `RefreshToken` | Refresh token saqlanmasi (rotation uchun) |
| `Conference` | Konferensiya (sarlavha, sana, banner, tashkilotchi) |
| `Session` | Sessiya / ma'ruza (vaqt, xona, ma'ruzachi) |
| `Registration` | Yozilish + unikal `ticketCode` (QR) |
| `Question` | Q&A savol (upvote, javob) |
| `Material` | Sessiya fayllari (PDF, slayd, va h.k.) |
| `Certificate` | Sertifikat (unikal kod, PDF URL) |
| `Feedback` | Sessiya bahosi (1–5 + komment) |
| `Notification` | Bildirishnoma |

### Enum'lar

- `Role`: `ADMIN | ORGANIZER | SPEAKER | PARTICIPANT | GUEST`
- `ConferenceStatus`: `DRAFT | PUBLISHED | ONGOING | FINISHED | CANCELLED`
- `RegistrationStatus`: `PENDING | CONFIRMED | CANCELLED | ATTENDED`
- `NotificationType`: `SYSTEM | CONFERENCE | SESSION | QUESTION | CERTIFICATE`

To'liq sxema: [`prisma/schema.prisma`](prisma/schema.prisma).

---

## Autentifikatsiya va rollar

### Token oqimi

1. `POST /api/auth/register` yoki `POST /api/auth/login` →
   `{ accessToken, refreshToken, user }` qaytaradi.
2. Har bir himoyalangan so'rovda header:
   ```
   Authorization: Bearer <accessToken>
   ```
3. Access token muddati tugaganda:
   ```
   POST /api/auth/refresh
   Body: { "refreshToken": "..." }
   ```
   Yangi juftlik qaytadi (refresh token **rotate** qilinadi).
4. `POST /api/auth/logout` — refresh tokenni serverdan o'chiradi.

### Rol asosida himoya

`@Roles(Role.ADMIN, Role.ORGANIZER)` dekoratori va `RolesGuard` orqali endpoint
ma'lum rollar uchun cheklanadi. Public endpointlar `@Public()` bilan belgilanadi.

---

## API endpointlari

> Hammasi `/api` prefiksi bilan. To'liq schema va misollar uchun **Swagger**'ni oching:
> `http://localhost:3000/docs`

### Auth

| Metod | Yo'l | Auth | Tavsif |
|-------|------|------|--------|
| `POST` | `/auth/register` | public | Ro'yxatdan o'tish |
| `POST` | `/auth/login` | public | Kirish |
| `POST` | `/auth/refresh` | public | Yangi access token |
| `POST` | `/auth/logout` | bearer | Sessiyadan chiqish |

### Users

| Metod | Yo'l | Auth | Tavsif |
|-------|------|------|--------|
| `GET` | `/users/me` | bearer | O'z profilim |
| `POST` | `/users/me/avatar` | bearer | Avatar yuklash |
| `DELETE` | `/users/me/avatar` | bearer | Avatarni o'chirish |
| `GET` | `/users` | ADMIN | Barcha foydalanuvchilar |
| `GET` | `/users/speakers` | ADMIN, ORGANIZER | Faqat ma'ruzachilar |
| `POST` | `/users` | ADMIN | Yangi foydalanuvchi yaratish |
| `GET` | `/users/:id` | bearer | Bitta foydalanuvchi |
| `PATCH` | `/users/:id` | ADMIN | Foydalanuvchini tahrirlash |
| `DELETE` | `/users/:id` | ADMIN | Foydalanuvchini o'chirish |

### Conferences

| Metod | Yo'l | Auth | Tavsif |
|-------|------|------|--------|
| `GET` | `/conferences` | public | Ro'yxat (`?status=...&search=...&category=...`) |
| `GET` | `/conferences/:id` | public | Bitta konferensiya |
| `POST` | `/conferences` | ADMIN, ORGANIZER | Yaratish |
| `PATCH` | `/conferences/:id` | ADMIN, ORGANIZER | Tahrirlash |
| `POST` | `/conferences/:id/banner` | ADMIN, ORGANIZER | Banner rasm yuklash |
| `DELETE` | `/conferences/:id/banner` | ADMIN, ORGANIZER | Bannerni olib tashlash |
| `DELETE` | `/conferences/:id` | bearer | O'chirish (faqat egasi/admin) |

### Sessions

| Metod | Yo'l | Auth | Tavsif |
|-------|------|------|--------|
| `GET` | `/sessions/conference/:conferenceId` | public | Konferensiya sessiyalari |
| `GET` | `/sessions/:id` | public | Bitta sessiya |
| `POST` | `/sessions` | ADMIN, ORGANIZER | Sessiya yaratish |
| `PATCH` | `/sessions/:id` | ADMIN, ORGANIZER | Tahrirlash |
| `DELETE` | `/sessions/:id` | ADMIN, ORGANIZER | O'chirish |

### Registrations

| Metod | Yo'l | Auth | Tavsif |
|-------|------|------|--------|
| `GET` | `/registrations/me` | bearer | Mening yozilishlarim |
| `GET` | `/registrations/conference/:conferenceId` | bearer | Konferensiya qatnashchilari |
| `POST` | `/registrations/conference/:conferenceId` | bearer | Konferensiyaga yozilish |
| `DELETE` | `/registrations/conference/:conferenceId` | bearer | Yozilishni bekor qilish |
| `GET` | `/registrations/ticket/:code` | public | Ticket'ni kod orqali tekshirish |
| `GET` | `/registrations/ticket/:code/download` | public | Ticket PDF (QR bilan) |

### Questions (Q&A)

| Metod | Yo'l | Auth | Tavsif |
|-------|------|------|--------|
| `GET` | `/questions/session/:sessionId` | public | Sessiya savollari |
| `POST` | `/questions` | bearer | Yangi savol berish |
| `POST` | `/questions/:id/upvote` | bearer | Savolga ovoz berish |
| `POST` | `/questions/:id/answer` | bearer | Savolga javob berish (speaker/organizer) |

### Notifications

| Metod | Yo'l | Auth | Tavsif |
|-------|------|------|--------|
| `GET` | `/notifications` | bearer | Mening bildirishnomalarim |
| `GET` | `/notifications/unread-count` | bearer | O'qilmaganlar soni |
| `PATCH` | `/notifications/:id/read` | bearer | O'qilgan deb belgilash |
| `PATCH` | `/notifications/read-all` | bearer | Hammasini o'qilgan deb belgilash |

### Materials

| Metod | Yo'l | Auth | Tavsif |
|-------|------|------|--------|
| `GET` | `/materials/session/:sessionId` | public | Sessiya materiallari |
| `POST` | `/materials/upload` | bearer | Fayl yuklash (multipart/form-data) |
| `DELETE` | `/materials/:id` | bearer | Faylni o'chirish |

### Certificates

| Metod | Yo'l | Auth | Tavsif |
|-------|------|------|--------|
| `GET` | `/certificates/me` | bearer | Mening sertifikatlarim |
| `POST` | `/certificates/issue/:conferenceId` | bearer | Sertifikat berish |
| `GET` | `/certificates/verify/:code` | public | Sertifikatni kod orqali tekshirish |
| `GET` | `/certificates/download/:code` | public | Sertifikat PDF'ini yuklab olish |

### Feedback

| Metod | Yo'l | Auth | Tavsif |
|-------|------|------|--------|
| `GET` | `/feedback/session/:sessionId` | public | Sessiya baholari ro'yxati |
| `GET` | `/feedback/session/:sessionId/average` | public | O'rtacha baho |
| `POST` | `/feedback` | bearer | Sessiyaga baho berish |

---

## Fayl yuklash (uploads)

- Barcha yuklangan fayllar `uploads/` papkasida saqlanadi va `/uploads/...`
  yo'li orqali statik tarzda taqdim etiladi.
- Maksimal hajm: `MAX_FILE_SIZE` (standart **10 MB**).
- **Banner / avatar (rasm)** uchun ruxsat etilgan formatlar: `PNG`, `JPG/JPEG`,
  `WEBP`, `GIF`. Rasmlar `sharp` orqali optimallashtiriladi.
- **Materiallar** uchun: `PDF`, `DOCX`, `PPTX`, `XLSX`, va boshqa hujjat formatlari.
- Fayl nomi serverda UUID asosida qayta nomlanadi (kolliziya bo'lmasligi uchun).
- Frontend `helmet` `Cross-Origin-Resource-Policy: cross-origin` bilan boshqa
  origindan fayllarni yuklay oladi.

---

## Socket.IO real-time qatlam

**WebSocket URL:** `ws://localhost:3000`

**Autentifikatsiya** — handshake'da JWT token uzatiladi:

```ts
const socket = io('http://localhost:3000', {
  auth: { token: accessToken },
});
```

### Mijoz → Server (emit)

| Event | Payload | Maqsad |
|-------|---------|--------|
| `join_conference` | `{ conferenceId }` | Konferensiya xonasiga qo'shilish |
| `leave_conference` | `{ conferenceId }` | Xonadan chiqish |
| `join_session` | `{ sessionId }` | Sessiya xonasiga qo'shilish |
| `send_question` | `{ sessionId, text }` | Yangi savol yuborish |
| `upvote_question` | `{ questionId, sessionId }` | Savolga ovoz berish |
| `send_message` | `{ conferenceId, text }` | Konferensiya chat'iga xabar |

### Server → Mijoz (listen)

| Event | Payload | Tavsif |
|-------|---------|--------|
| `new_question` | `Question` | Yangi savol yaratildi |
| `question_upvoted` | `Question` | Savol ovoz oldi |
| `new_message` | `{ user, text, timestamp }` | Chat xabari |
| `user_joined` | `{ userId, name }` | Yangi qatnashchi qo'shildi |
| `session_updated` | `Session` | Sessiya o'zgardi |
| `notification` | `Notification` | Shaxsiy bildirishnoma (`user:<id>` xonasi) |

**Xona (room) konvensiyasi:**
- `conference:<id>` — konferensiya bo'yicha
- `session:<id>` — sessiya bo'yicha
- `user:<id>` — shaxsiy bildirishnomalar

---

## Email xizmati

- **Development:** xabarlar console'ga yoziladi (SMTP kerak emas).
- **Production:** `.env`'da `SMTP_*` o'zgaruvchilarini to'ldiring va
  [`src/email/email.service.ts`](src/email/email.service.ts)'dagi `nodemailer`
  transport'ini yoqing.

Email yuborilishi mumkin bo'lgan vaziyatlar:
- Ro'yxatdan o'tish tasdiqi
- Konferensiyaga yozilish chiptasi
- Sessiya boshlanishi haqida eslatma
- Sertifikat berildi

---

## Sertifikat (PDF + QR)

`POST /api/certificates/issue/:conferenceId` chaqirilganda:

1. Foydalanuvchi konferensiyada qatnashganligi tekshiriladi (`ATTENDED` status).
2. Unikal kod (`code`) generatsiya qilinadi.
3. `pdfkit` orqali PDF tuziladi: F.I.Sh., konferensiya nomi, sana, QR kod.
4. QR kod `GET /api/certificates/verify/:code` URL'iga yo'naltiradi.
5. PDF `uploads/certificates/`'da saqlanadi, URL javobda qaytariladi.

---

## Xavfsizlik

| Qatlam | Mexanizm |
|--------|----------|
| HTTP headerlar | `helmet` (XSS, clickjacking, MIME sniff himoyasi) |
| CORS | Faqat `FRONTEND_URL` (credentials: `true`) |
| Rate-limit | `@nestjs/throttler` — `THROTTLE_LIMIT`/`THROTTLE_TTL` |
| Validatsiya | `ValidationPipe` (whitelist + forbidNonWhitelisted) |
| Parol | `bcrypt` (10 rounds) |
| JWT | Ikkita sirli kalit (access + refresh), refresh rotation |
| Rol nazorati | `JwtAuthGuard` + `RolesGuard` + `@Roles()` |
| SQL injection | Prisma parametrlangan so'rovlar |
| Fayl yuklash | MIME tip va kengaytma whitelist + hajm chegarasi |

---

## Testlash

```bash
yarn test               # unit testlar (jest)
yarn test:watch         # watch rejimi
yarn test:cov           # coverage
yarn test:e2e           # end-to-end (test/jest-e2e.json)
```

Test fayllar `*.spec.ts` shaklida modul ichida joylashadi (`src/**/*.spec.ts`).

---

## Production deploy

1. **`.env` faylini production qiymatlar bilan to'ldiring:**
   - `NODE_ENV=production`
   - `JWT_ACCESS_SECRET` va `JWT_REFRESH_SECRET` — kuchli random satr
     (`openssl rand -base64 64`)
   - `DATABASE_URL` — production PostgreSQL
   - `FRONTEND_URL` — frontend domeni
   - `SMTP_*` — haqiqiy SMTP server

2. **Build va migration:**
   ```bash
   yarn install --frozen-lockfile
   yarn db:generate
   yarn db:migrate deploy   # productionda dev emas, deploy
   yarn build
   ```

3. **Ishga tushirish:**
   ```bash
   yarn start:prod
   ```

4. **Reverse proxy (nginx) tavsiya etiladi:**
   - `/api/*` va `/docs` → backend (3000-port)
   - `/uploads/*` → backend yoki to'g'ridan-to'g'ri fayl tizimi
   - WebSocket uchun `Upgrade` header'ini uzatish

5. **Process manager:** `pm2`, `systemd`, yoki Docker.

---

## Litsenziya

UNLICENSED — ichki loyiha.
