# EventLab.uz — Backend

Backend service for a conference planning and management platform. Built with
NestJS, Prisma, and Socket.IO — provides a REST API plus a real-time WebSocket
layer.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Requirements](#requirements)
3. [Quick Start](#quick-start)
4. [Environment Variables (.env)](#environment-variables-env)
5. [Test Users](#test-users)
6. [Useful Commands](#useful-commands)
7. [Project Structure](#project-structure)
8. [Database Models](#database-models)
9. [Authentication & Roles](#authentication--roles)
10. [API Endpoints](#api-endpoints)
11. [File Uploads](#file-uploads)
12. [Socket.IO Real-time Layer](#socketio-real-time-layer)
13. [Email Service](#email-service)
14. [Certificates (PDF + QR)](#certificates-pdf--qr)
15. [Security](#security)
16. [Testing](#testing)
17. [Production Deployment](#production-deployment)

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | **NestJS 11** (Express platform) |
| Language | **TypeScript 5.7** |
| ORM | **Prisma 7** |
| Database | **PostgreSQL 14+** |
| Real-time | **Socket.IO 4** (`@nestjs/websockets`) |
| Auth | **JWT** (access + refresh) + **Passport** |
| Validation | `class-validator`, `class-transformer`, `ValidationPipe` |
| Security | `helmet`, `@nestjs/throttler`, `bcrypt` |
| Documentation | `@nestjs/swagger` (OpenAPI 3) |
| File handling | `multer` + `sharp` (image optimization) |
| PDF / QR | `pdfkit` + `qrcode` |
| Email | `nodemailer` (console logger in dev) |

---

## Requirements

- **Node.js** ≥ 20
- **Yarn** ≥ 1.22 (or `npm`)
- **PostgreSQL** ≥ 14 (local install or Docker)

---

## Quick Start

### 1. Create the PostgreSQL database

```bash
PGPASSWORD=YOUR_PASSWORD psql -h localhost -U postgres -c "CREATE DATABASE eventlab;"
```

### 2. Configure `.env`

Copy `.env.example` to `.env` and adjust `DATABASE_URL` to match your setup:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/eventlab"
```

The full list is in the [Environment Variables](#environment-variables-env) section below.

### 3. Install dependencies

```bash
yarn install
```

### 4. Prepare the database

```bash
yarn db:migrate     # apply schema → DB (runs migrations)
yarn db:seed        # load test data
```

### 5. Start the server

```bash
yarn start:dev
```

| URL | Purpose |
|-----|---------|
| `http://localhost:3000/api` | REST API root |
| `http://localhost:3000/docs` | Swagger UI (interactive docs) |
| `http://localhost:3000/uploads/...` | Static files (images, documents, PDFs) |
| `ws://localhost:3000` | Socket.IO endpoint |

---

## Environment Variables (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `development` / `production` |
| `PORT` | `3000` | HTTP port |
| `API_PREFIX` | `api` | Prefix applied to all routes |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed CORS origin |
| `DATABASE_URL` | — | PostgreSQL connection string (required) |
| `JWT_ACCESS_SECRET` | `dev-access-secret` | Secret for access tokens |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Access token lifetime |
| `JWT_REFRESH_SECRET` | `dev-refresh-secret` | Secret for refresh tokens |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token lifetime |
| `SMTP_HOST` | — | SMTP server (production) |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASS` | — | SMTP password |
| `SMTP_FROM` | `EventLab.uz <noreply@eventlab.uz>` | Email "From" header |
| `UPLOAD_DIR` | `./uploads` | Folder where uploaded files are stored |
| `MAX_FILE_SIZE` | `10485760` (10 MB) | Maximum upload size in bytes |
| `THROTTLE_TTL` | `60` | Rate-limit window (seconds) |
| `THROTTLE_LIMIT` | `100` | Max requests per window |

> **Always rotate the JWT secrets in production** and use long random values.

---

## Test Users

After running `yarn db:seed` (password for everyone: **`Password123!`**):

| Email | Role |
|-------|------|
| `admin@eventlab.uz` | `ADMIN` |
| `organizer@eventlab.uz` | `ORGANIZER` |
| `speaker@eventlab.uz` | `SPEAKER` |
| `user@eventlab.uz` | `PARTICIPANT` |

---

## Useful Commands

```bash
# Development
yarn start:dev          # watch mode (auto restart on changes)
yarn start:debug        # with --inspect debugger

# Production
yarn build              # compile to dist/
yarn start:prod         # node dist/main

# Database
yarn db:generate        # regenerate Prisma Client
yarn db:migrate         # create + apply a new migration
yarn db:push            # push schema directly without a migration
yarn db:seed            # load test data
yarn db:studio          # Prisma Studio GUI (browser-based)
yarn db:reset           # wipe and recreate DB (DANGER: drops all data)

# Quality
yarn lint               # ESLint
yarn format             # Prettier
yarn test               # unit tests
yarn test:cov           # unit tests with coverage report
yarn test:e2e           # end-to-end tests
```

---

## Project Structure

```
eventlab-backend/
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── migrations/           # Migration history
│   └── seed.ts               # Seed data
├── src/
│   ├── auth/                 # JWT — register / login / refresh / logout
│   ├── users/                # Users, avatar uploads
│   ├── conferences/          # Conference CRUD + banner uploads
│   ├── sessions/             # Session (talk) CRUD
│   ├── registrations/        # Sign-ups + ticket QR + ticket PDF
│   ├── questions/            # Q&A (questions, answers, upvotes)
│   ├── notifications/        # Notifications
│   ├── materials/            # File uploads (slides, documents)
│   ├── certificates/         # Certificates (PDF + QR + verify)
│   ├── feedback/             # Session ratings (1–5 stars)
│   ├── gateway/              # Socket.IO (events.gateway.ts)
│   ├── email/                # Email service (dev: console)
│   ├── prisma/               # PrismaService
│   ├── common/               # decorators, guards, filters, interceptors
│   ├── config/               # configuration loader
│   ├── uploads/              # MulterModule, storage configuration
│   ├── app.module.ts         # Root module
│   └── main.ts               # bootstrap (helmet, CORS, Swagger)
├── uploads/                  # Uploaded files (gitignored)
├── test/                     # E2E tests
├── nest-cli.json
├── tsconfig.json
└── package.json
```

---

## Database Models

The Prisma schema defines 9 main models:

| Model | Description |
|-------|-------------|
| `User` | User account (role, password, profile) |
| `RefreshToken` | Stored refresh tokens (used for token rotation) |
| `Conference` | Conference (title, dates, banner, organizer) |
| `Session` | Session / talk (time, room, speaker) |
| `Registration` | Registration with a unique `ticketCode` (used in QR) |
| `Question` | Q&A question (upvotes, answer) |
| `Material` | Session files (PDF, slides, etc.) |
| `Certificate` | Certificate (unique code, PDF URL) |
| `Feedback` | Session rating (1–5 + optional comment) |
| `Notification` | Notification |

### Enums

- `Role`: `ADMIN | ORGANIZER | SPEAKER | PARTICIPANT | GUEST`
- `ConferenceStatus`: `DRAFT | PUBLISHED | ONGOING | FINISHED | CANCELLED`
- `RegistrationStatus`: `PENDING | CONFIRMED | CANCELLED | ATTENDED`
- `NotificationType`: `SYSTEM | CONFERENCE | SESSION | QUESTION | CERTIFICATE`

Full schema: [`prisma/schema.prisma`](prisma/schema.prisma).

---

## Authentication & Roles

### Token flow

1. `POST /api/auth/register` or `POST /api/auth/login` returns
   `{ accessToken, refreshToken, user }`.
2. Send the access token in the `Authorization` header on every protected request:
   ```
   Authorization: Bearer <accessToken>
   ```
3. When the access token expires, exchange the refresh token:
   ```
   POST /api/auth/refresh
   Body: { "refreshToken": "..." }
   ```
   A new pair is returned and the refresh token is **rotated**.
4. `POST /api/auth/logout` removes the refresh token from the server.

### Role-based access control

The `@Roles(Role.ADMIN, Role.ORGANIZER)` decorator combined with `RolesGuard`
restricts an endpoint to specific roles. Public endpoints are marked with
`@Public()` and skip authentication entirely.

---

## API Endpoints

> All routes are mounted under the `/api` prefix. For full schemas and
> request/response examples open **Swagger** at `http://localhost:3000/docs`.

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | public | Sign up |
| `POST` | `/auth/login` | public | Log in |
| `POST` | `/auth/refresh` | public | Issue a new access token |
| `POST` | `/auth/logout` | bearer | End the current session |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/users/me` | bearer | Current user profile |
| `POST` | `/users/me/avatar` | bearer | Upload avatar |
| `DELETE` | `/users/me/avatar` | bearer | Remove avatar |
| `GET` | `/users` | ADMIN | List all users |
| `GET` | `/users/speakers` | ADMIN, ORGANIZER | List only speakers |
| `POST` | `/users` | ADMIN | Create a user |
| `GET` | `/users/:id` | bearer | Get a single user |
| `PATCH` | `/users/:id` | ADMIN | Update a user |
| `DELETE` | `/users/:id` | ADMIN | Delete a user |

### Conferences

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/conferences` | public | List (`?status=...&search=...&category=...`) |
| `GET` | `/conferences/:id` | public | Single conference |
| `POST` | `/conferences` | ADMIN, ORGANIZER | Create |
| `PATCH` | `/conferences/:id` | ADMIN, ORGANIZER | Update |
| `POST` | `/conferences/:id/banner` | ADMIN, ORGANIZER | Upload banner image |
| `DELETE` | `/conferences/:id/banner` | ADMIN, ORGANIZER | Remove banner |
| `DELETE` | `/conferences/:id` | bearer | Delete (owner / admin only) |

### Sessions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/sessions/conference/:conferenceId` | public | Sessions of a conference |
| `GET` | `/sessions/:id` | public | Single session |
| `POST` | `/sessions` | ADMIN, ORGANIZER | Create a session |
| `PATCH` | `/sessions/:id` | ADMIN, ORGANIZER | Update |
| `DELETE` | `/sessions/:id` | ADMIN, ORGANIZER | Delete |

### Registrations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/registrations/me` | bearer | My registrations |
| `GET` | `/registrations/conference/:conferenceId` | bearer | Conference attendees |
| `POST` | `/registrations/conference/:conferenceId` | bearer | Register for a conference |
| `DELETE` | `/registrations/conference/:conferenceId` | bearer | Cancel registration |
| `GET` | `/registrations/ticket/:code` | public | Verify a ticket by code |
| `GET` | `/registrations/ticket/:code/download` | public | Download ticket PDF (with QR) |

### Questions (Q&A)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/questions/session/:sessionId` | public | Questions for a session |
| `POST` | `/questions` | bearer | Submit a new question |
| `POST` | `/questions/:id/upvote` | bearer | Upvote a question |
| `POST` | `/questions/:id/answer` | bearer | Answer a question (speaker / organizer) |

### Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/notifications` | bearer | My notifications |
| `GET` | `/notifications/unread-count` | bearer | Unread count |
| `PATCH` | `/notifications/:id/read` | bearer | Mark one as read |
| `PATCH` | `/notifications/read-all` | bearer | Mark all as read |

### Materials

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/materials/session/:sessionId` | public | Materials for a session |
| `POST` | `/materials/upload` | bearer | Upload a file (multipart/form-data) |
| `DELETE` | `/materials/:id` | bearer | Delete a file |

### Certificates

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/certificates/me` | bearer | My certificates |
| `POST` | `/certificates/issue/:conferenceId` | bearer | Issue a certificate |
| `GET` | `/certificates/verify/:code` | public | Verify a certificate by code |
| `GET` | `/certificates/download/:code` | public | Download certificate PDF |

### Feedback

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/feedback/session/:sessionId` | public | All ratings for a session |
| `GET` | `/feedback/session/:sessionId/average` | public | Average rating |
| `POST` | `/feedback` | bearer | Submit a rating |

---

## File Uploads

- All uploaded files are stored under `uploads/` and served statically through
  `/uploads/...`.
- Maximum size: `MAX_FILE_SIZE` (default **10 MB**).
- **Banner / avatar (images):** allowed types are `PNG`, `JPG/JPEG`, `WEBP`,
  `GIF`. Images are optimized via `sharp`.
- **Materials:** `PDF`, `DOCX`, `PPTX`, `XLSX`, and other common document
  formats are accepted.
- File names are renamed to UUIDs on the server to avoid collisions.
- The frontend can serve images from a different origin because `helmet` is
  configured with `Cross-Origin-Resource-Policy: cross-origin`.

---

## Socket.IO Real-time Layer

**WebSocket URL:** `ws://localhost:3000`

**Authentication** — pass the JWT token in the handshake:

```ts
const socket = io('http://localhost:3000', {
  auth: { token: accessToken },
});
```

### Client → Server (emit)

| Event | Payload | Purpose |
|-------|---------|---------|
| `join_conference` | `{ conferenceId }` | Join a conference room |
| `leave_conference` | `{ conferenceId }` | Leave the room |
| `join_session` | `{ sessionId }` | Join a session room |
| `send_question` | `{ sessionId, text }` | Submit a new question |
| `upvote_question` | `{ questionId, sessionId }` | Upvote a question |
| `send_message` | `{ conferenceId, text }` | Send a chat message |

### Server → Client (listen)

| Event | Payload | Description |
|-------|---------|-------------|
| `new_question` | `Question` | A new question was created |
| `question_upvoted` | `Question` | A question was upvoted |
| `new_message` | `{ user, text, timestamp }` | Chat message |
| `user_joined` | `{ userId, name }` | A new participant joined |
| `session_updated` | `Session` | Session was modified |
| `notification` | `Notification` | Personal notification (delivered to `user:<id>` room) |

**Room naming convention:**
- `conference:<id>` — per conference
- `session:<id>` — per session
- `user:<id>` — per-user notifications

---

## Email Service

- **Development:** messages are written to the console (no SMTP needed).
- **Production:** fill in the `SMTP_*` variables in `.env` and enable the
  `nodemailer` transport in
  [`src/email/email.service.ts`](src/email/email.service.ts).

Possible email triggers:
- Sign-up confirmation
- Conference registration ticket
- Reminder before a session starts
- Certificate issued

---

## Certificates (PDF + QR)

When `POST /api/certificates/issue/:conferenceId` is called:

1. The system verifies the user attended the conference (`ATTENDED` status).
2. A unique `code` is generated.
3. A PDF is built with `pdfkit`: full name, conference title, date, QR code.
4. The QR code points to `GET /api/certificates/verify/:code`.
5. The PDF is saved under `uploads/certificates/`, the URL is returned in the
   response.

---

## Security

| Layer | Mechanism |
|-------|-----------|
| HTTP headers | `helmet` (XSS, clickjacking, MIME-sniff protection) |
| CORS | Only `FRONTEND_URL`, `credentials: true` |
| Rate limiting | `@nestjs/throttler` — `THROTTLE_LIMIT` per `THROTTLE_TTL` |
| Validation | `ValidationPipe` (whitelist + `forbidNonWhitelisted`) |
| Passwords | `bcrypt` (10 rounds) |
| JWT | Two separate secrets (access + refresh), refresh rotation |
| Authorization | `JwtAuthGuard` + `RolesGuard` + `@Roles()` |
| SQL injection | Prisma parameterized queries |
| File uploads | MIME-type and extension whitelist + size limit |

---

## Testing

```bash
yarn test               # unit tests (jest)
yarn test:watch         # watch mode
yarn test:cov           # coverage report
yarn test:e2e           # end-to-end (test/jest-e2e.json)
```

Test files live next to the modules they cover, named `*.spec.ts`
(`src/**/*.spec.ts`).

---

## Production Deployment

1. **Fill `.env` with real production values:**
   - `NODE_ENV=production`
   - `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` — long random strings
     (`openssl rand -base64 64`)
   - `DATABASE_URL` — production PostgreSQL
   - `FRONTEND_URL` — frontend domain
   - `SMTP_*` — real SMTP server

2. **Build and apply migrations:**
   ```bash
   yarn install --frozen-lockfile
   yarn db:generate
   yarn db:migrate deploy   # use `deploy`, not `dev`, in production
   yarn build
   ```

3. **Start the server:**
   ```bash
   yarn start:prod
   ```

4. **A reverse proxy (nginx) is recommended:**
   - `/api/*` and `/docs` → backend (port 3000)
   - `/uploads/*` → backend, or serve directly from disk
   - Forward the `Upgrade` header for WebSocket support

5. **Process manager:** `pm2`, `systemd`, or Docker.

---

## License

UNLICENSED — internal project.
