import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';
import { QuestionsModule } from '../questions/questions.module';

@Module({
  imports: [JwtModule.register({}), QuestionsModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class GatewayModule {}
