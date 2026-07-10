import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaService } from '../prisma.service';
import { AutomationController } from './controllers/automation.controller';
import { HealthController } from './controllers/health.controller';
import { AutomationRepository } from './repositories/automation.repository';
import { ExecutionRepository } from './repositories/execution.repository';
import { ProcessedEventRepository } from './repositories/processed-event.repository';
import { AutomationService } from './services/automation.service';
import { ConditionService } from './services/condition.service';
import { QueueService } from './services/queue.service';
import { ActionDispatcher } from './services/action-dispatcher';
import { IdempotencyService } from './services/idempotency.service';
import { LockService } from './services/lock.service';
import { MetricsService } from './services/metrics.service';
import { AutomationConfig } from './config/automation.config';
import {
  SendMessageActionHandler,
  WaitActionHandler,
  AddTagActionHandler,
  CallWebhookActionHandler,
} from './services/action-handlers';
import { ActionWorker } from './workers/action.worker';
import { AutomationWorker } from './workers/automation.worker';
import { MessagingModule } from '../modules/messaging/messaging.module';
import { MessagingService as MsgSvc } from '../modules/messaging/services/messaging.service';

@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: 'automation',
      },
      {
        name: 'automation-dlq',
      },
    ),
    MessagingModule,
  ],
  controllers: [AutomationController, HealthController],
  providers: [
    PrismaService,
    AutomationConfig,
    AutomationRepository,
    ExecutionRepository,
    ProcessedEventRepository,
    AutomationService,
    ConditionService,
    QueueService,
    ActionDispatcher,
    IdempotencyService,
    LockService,
    MetricsService,
    {
      provide: 'MessagingService',
      useExisting: MsgSvc,
    },
    SendMessageActionHandler,
    WaitActionHandler,
    AddTagActionHandler,
    CallWebhookActionHandler,
    ActionWorker,
    AutomationWorker,
  ],
  exports: [
    AutomationConfig,
    AutomationService,
    AutomationRepository,
    ExecutionRepository,
    ProcessedEventRepository,
    IdempotencyService,
    LockService,
    MetricsService,
  ],
})
export class AutomationModule {}
