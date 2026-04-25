# EventLab.uz — Backend

Konferensiyalarni rejalashtirish va boshqarish tizimining backend qismi.

## Texnologiyalar

- **NestJS 11** — modulli backend freymvork
- **Prisma 7** + PostgreSQL — ORM va ma'lumotlar bazasi
- **Socket.IO** — real-time qatlam (Q&A, bildirishnomalar)
- **JWT** — autentifikatsiya (access + refresh tokenlar)
- **Swagger** — interaktiv API hujjati
- **Helmet + Throttler + ValidationPipe** — xavfsizlik

## Tezkor ishga tushirish

### 1. PostgreSQL'ni tayyorlang

```bash
PGPASSWORD=YOUR_PASSWORD psql -h localhost -U postgres -c "CREATE DATABASE eventlab;"
```

### 2. `.env` faylini sozlang

`.env.example`'ni `.env`'ga ko'chiring va `DATABASE_URL`'ni o'zingiznikiga moslang:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/eventlab"
```

### 3. Paketlarni o'rnating

```bash
yarn install
```

### 4. Database tayyorlang

```bash
yarn db:migrate     # schema → DB
yarn db:seed        # test ma'lumotlar
```

### 5. Serverni ishga tushiring

```bash
yarn start:dev
```

- API:     http://localhost:3000/api
- Swagger: http://localhost:3000/docs
- Static:  http://localhost:3000/uploads/...

## Test foydalanuvchilar

Seed dan keyin (parol hammasi: `Password123!`):

| Email | Rol |
|-------|-----|
| `admin@eventlab.uz` | ADMIN |
| `organizer@eventlab.uz` | ORGANIZER |
| `speaker@eventlab.uz` | SPEAKER |
| `user@eventlab.uz` | PARTICIPANT |

## Foydali komandalar

```bash
yarn start:dev      # watch rejimida
yarn build          # production build
yarn start:prod     # production server
yarn db:migrate     # yangi migration
yarn db:push        # schema'ni migration'siz qo'llash
yarn db:seed        # test ma'lumotlar
yarn db:studio      # Prisma Studio GUI
yarn db:reset       # DB reset (ehtiyot bo'ling!)
```

## API endpointlari

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Users
- `GET /api/users/me`
- `GET /api/users` (ADMIN)
- `GET /api/users/:id`
- `DELETE /api/users/:id` (ADMIN)

### Conferences
- `GET /api/conferences` (filter: `?status=...&search=...`)
- `GET /api/conferences/:id`
- `POST /api/conferences` (ORGANIZER)
- `PATCH /api/conferences/:id`
- `DELETE /api/conferences/:id`

### Sessions
- `GET /api/sessions/conference/:conferenceId`
- `GET /api/sessions/:id`
- `POST/PATCH/DELETE /api/sessions/:id` (ORGANIZER)

### Registrations
- `GET /api/registrations/me`
- `GET /api/registrations/conference/:conferenceId`
- `POST /api/registrations/conference/:conferenceId`
- `DELETE /api/registrations/conference/:conferenceId`

### Questions (Q&A)
- `GET /api/questions/session/:sessionId`
- `POST /api/questions`
- `POST /api/questions/:id/upvote`
- `POST /api/questions/:id/answer`

### Notifications
- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

### Materials
- `GET /api/materials/session/:sessionId`
- `POST /api/materials/upload` (multipart/form-data)
- `DELETE /api/materials/:id`

### Certificates
- `GET /api/certificates/me`
- `POST /api/certificates/issue/:conferenceId`
- `GET /api/certificates/verify/:code` (public)

### Feedback
- `GET /api/feedback/session/:sessionId`
- `GET /api/feedback/session/:sessionId/average`
- `POST /api/feedback`

## Socket.IO eventlari

WebSocket URL: `ws://localhost:3000`. Auth: handshake da `auth.token` orqali JWT.

### Mijoz → Server
- `join_conference` `{ conferenceId }`
- `leave_conference` `{ conferenceId }`
- `join_session` `{ sessionId }`
- `send_question` `{ sessionId, text }`
- `upvote_question` `{ questionId, sessionId }`
- `send_message` `{ conferenceId, text }`

### Server → Mijoz
- `new_question` — yangi savol
- `question_upvoted` — savol upvote qilindi
- `new_message` — yangi chat xabari
- `user_joined` — yangi qatnashchi
- `session_updated` — sessiya yangilandi

## Loyiha tuzilmasi

```
src/
├── auth/              JWT, register/login
├── users/             foydalanuvchilar
├── conferences/       konferensiya CRUD
├── sessions/          sessiyalar
├── registrations/     yozilish + chipta
├── questions/         Q&A
├── notifications/     bildirishnomalar
├── materials/         fayl yuklash
├── certificates/      sertifikat
├── feedback/          baholash
├── gateway/           Socket.IO
├── email/             email (console log)
├── prisma/            PrismaService
├── common/            decorators, guards, filters
├── config/            configuration
└── main.ts            bootstrap
```

Email dev rejimda console'ga yoziladi (SMTP kerak emas).
Productionda `src/email/email.service.ts`'ni nodemailer bilan to'ldiring.
# eventlabs-backend
