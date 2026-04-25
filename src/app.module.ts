import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { join } from 'path';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConferencesModule } from './conferences/conferences.module';
import { SessionsModule } from './sessions/sessions.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { QuestionsModule } from './questions/questions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MaterialsModule } from './materials/materials.module';
import { CertificatesModule } from './certificates/certificates.module';
import { FeedbackModule } from './feedback/feedback.module';
import { GatewayModule } from './gateway/gateway.module';
import { EmailModule } from './email/email.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    EmailModule,
    AuthModule,
    UsersModule,
    ConferencesModule,
    SessionsModule,
    RegistrationsModule,
    QuestionsModule,
    NotificationsModule,
    MaterialsModule,
    CertificatesModule,
    FeedbackModule,
    GatewayModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
