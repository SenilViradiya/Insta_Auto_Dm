import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { MessagingService } from '../services/messaging.service';
import { MessageRepository } from '../repositories/message.repository';
import { MessagingMetricsService } from '../metrics/messaging-metrics.service';
import { SendMessageApiSchema } from '../dto/send-message.dto';

@Controller('messaging')
export class MessagingController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly messageRepo: MessageRepository,
    private readonly metrics: MessagingMetricsService,
  ) {}

  @Post('send')
  async sendMessage(@Body() body: any) {
    const parsed = SendMessageApiSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: parsed.error.format(),
      });
    }

    return this.messagingService.send(parsed.data);
  }

  @Get('messages/:id')
  async getMessage(@Param('id') id: string) {
    const message = await this.messageRepo.findById(id);
    if (!message) {
      throw new NotFoundException(`Message ${id} not found`);
    }
    return message;
  }

  @Get('messages')
  async getMessages(
    @Query('accountId') accountId: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    if (!accountId) {
      throw new BadRequestException('accountId query parameter is required');
    }
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 20;
    return this.messageRepo.findByAccount(accountId, page, limit);
  }

  @Get('metrics')
  getMetrics() {
    return this.metrics.getMetrics();
  }
}
