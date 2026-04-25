import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { QuestionsService } from '../questions/questions.service';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private questions: QuestionsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (token) {
        const payload = await this.jwt.verifyAsync(token, {
          secret: this.config.get<string>('jwt.accessSecret'),
        });
        client.data.user = payload;
        // Shaxsiy bildirishnomalar uchun foydalanuvchi room'iga qo'shamiz
        if (payload?.sub) {
          client.join(`user:${payload.sub}`);
        }
        this.logger.log(
          `Client connected: ${client.id} (user: ${payload.email})`,
        );
      } else {
        this.logger.log(`Anonymous client connected: ${client.id}`);
      }
    } catch (err) {
      this.logger.warn(
        `Auth failed for socket ${client.id}: ${(err as Error).message}`,
      );
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_conference')
  joinConference(
    @MessageBody() data: { conferenceId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `conference:${data.conferenceId}`;
    client.join(room);
    this.server.to(room).emit('user_joined', {
      userId: client.data.user?.sub,
      socketId: client.id,
    });
    return { joined: room };
  }

  @SubscribeMessage('leave_conference')
  leaveConference(
    @MessageBody() data: { conferenceId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `conference:${data.conferenceId}`;
    client.leave(room);
    return { left: room };
  }

  @SubscribeMessage('join_session')
  joinSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`session:${data.sessionId}`);
    return { joined: `session:${data.sessionId}` };
  }

  @SubscribeMessage('send_question')
  async sendQuestion(
    @MessageBody() data: { sessionId: string; text: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.sub;
    if (!userId) return { error: 'Unauthorized' };

    const question = await this.questions.create(userId, data);
    this.server.to(`session:${data.sessionId}`).emit('new_question', question);
    return { question };
  }

  @SubscribeMessage('upvote_question')
  async upvoteQuestion(
    @MessageBody() data: { questionId: string; sessionId: string },
  ) {
    const updated = await this.questions.upvote(data.questionId);
    this.server
      .to(`session:${data.sessionId}`)
      .emit('question_upvoted', updated);
    return updated;
  }

  @SubscribeMessage('send_message')
  sendMessage(
    @MessageBody() data: { conferenceId: string; text: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `conference:${data.conferenceId}`;
    const payload = {
      userId: client.data.user?.sub,
      text: data.text,
      timestamp: new Date().toISOString(),
    };
    this.server.to(room).emit('new_message', payload);
    return payload;
  }

  // server-side helpers (to be called from services)
  notifySessionUpdate(sessionId: string, payload: unknown) {
    this.server.to(`session:${sessionId}`).emit('session_updated', payload);
  }

  notifyConference(conferenceId: string, event: string, payload: unknown) {
    this.server.to(`conference:${conferenceId}`).emit(event, payload);
  }

  notifySession(sessionId: string, event: string, payload: unknown) {
    this.server.to(`session:${sessionId}`).emit(event, payload);
  }

  notifyUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
