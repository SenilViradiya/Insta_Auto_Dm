import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaService } from '../prisma.service';
import { AutomationController } from './controllers/automation.controller';
import { ExecutionController } from './controllers/execution.controller';
import { HealthController } from './controllers/health.controller';
import { AutomationRepository } from './repositories/automation.repository';
import { ExecutionRepository } from './repositories/execution.repository';
import { ProcessedEventRepository } from './repositories/processed-event.repository';
import { AutomationService } from './services/automation.service';
import { ConditionService } from './services/condition.service';
import { ConditionEngine } from './services/condition-engine';
import { VariableResolver } from './services/variable-resolver';
import { ExecutionEngine } from './services/execution-engine';
import { ActionStrategyResolver } from './services/action-strategy.resolver';
import { SendMessageActionStrategy } from './strategies/send-message-action.strategy';
import { WaitActionStrategy } from './strategies/wait-action.strategy';
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
import { MetaPlatformModule } from '../modules/meta-platform/meta-platform.module';

// Strategies and resolvers
import { TriggerRegistry } from './services/trigger.registry';
import { TriggerResolver } from './services/trigger.resolver';
import { DirectMessageTriggerStrategy } from './strategies/direct-message.strategy';
import { ReelCommentTriggerStrategy } from './strategies/reel-comment.strategy';
import { PostCommentTriggerStrategy } from './strategies/post-comment.strategy';
import { StoryReplyTriggerStrategy } from './strategies/story-reply.strategy';
import { StoryMentionTriggerStrategy } from './strategies/story-mention.strategy';

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
    MetaPlatformModule,
  ],
  controllers: [AutomationController, ExecutionController, HealthController],
  providers: [
    PrismaService,
    AutomationConfig,
    AutomationRepository,
    ExecutionRepository,
    ProcessedEventRepository,
    AutomationService,
    ConditionService,
    ConditionEngine,
    VariableResolver,
    ExecutionEngine,
    ActionStrategyResolver,
    SendMessageActionStrategy,
    WaitActionStrategy,
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
    TriggerRegistry,
    TriggerResolver,
    DirectMessageTriggerStrategy,
    ReelCommentTriggerStrategy,
    PostCommentTriggerStrategy,
    StoryReplyTriggerStrategy,
    StoryMentionTriggerStrategy,
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
    TriggerRegistry,
    TriggerResolver,
    ConditionEngine,
    VariableResolver,
    ExecutionEngine,
    ActionStrategyResolver,
  ],
})
export class AutomationModule {}
