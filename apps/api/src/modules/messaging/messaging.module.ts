import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { MessagingConfig } from './config/messaging.config';
import { MessagingController } from './controllers/messaging.controller';
import { MessagingService } from './services/messaging.service';
import { MetaGraphClient } from './clients/meta-graph.client';
import { TokenService } from './token/token.service';
import { MetaRateLimiterService } from './rate-limit/rate-limiter.service';
import { MessageRepository } from './repositories/message.repository';
import { MessagingMetricsService } from './metrics/messaging-metrics.service';

@Module({
  controllers: [MessagingController],
  providers: [
    PrismaService,
    MessagingConfig,
    MessagingService,
    MetaGraphClient,
    TokenService,
    MetaRateLimiterService,
    MessageRepository,
    MessagingMetricsService,
  ],
  exports: [MessagingService, MessagingMetricsService],
})
export class MessagingModule {}
