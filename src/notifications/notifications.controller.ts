import { Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  findAll(@CurrentUser('sub') userId: string) {
    return this.notifications.findByUser(userId);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser('sub') userId: string) {
    const count = await this.notifications.unreadCount(userId);
    return { count };
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.notifications.markAsRead(id, userId);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser('sub') userId: string) {
    return this.notifications.markAllAsRead(userId);
  }
}
