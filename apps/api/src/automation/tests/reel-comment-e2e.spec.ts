import { Test, TestingModule } from '@nestjs/testing';
import { WebhookController } from '../../meta/webhook.controller';
import { AutomationService } from '../services/automation.service';
import { AutomationRepository } from '../repositories/automation.repository';
import { ExecutionRepository } from '../repositories/execution.repository';
import { ProcessedEventRepository } from '../repositories/processed-event.repository';
import { IdempotencyService } from '../services/idempotency.service';
import { LockService } from '../services/lock.service';
import { TriggerRegistry } from '../services/trigger.registry';
import { TriggerResolver } from '../services/trigger.resolver';
import { ConditionEngine } from '../services/condition-engine';
import { ExecutionEngine } from '../services/execution-engine';
import { ActionStrategyResolver } from '../services/action-strategy.resolver';
import { VariableResolver } from '../services/variable-resolver';
import { QueueService } from '../services/queue.service';
import { MetricsService } from '../services/metrics.service';
import { AutomationConfig } from '../config/automation.config';
import { PrismaService } from '../../prisma.service';
import { TriggerType, ActionType, ExecutionStatus, Operator } from '@prisma/client';
import { SendMessageActionStrategy } from '../strategies/send-message-action.strategy';
import { WaitActionStrategy } from '../strategies/wait-action.strategy';
import { TokenService } from '../../modules/meta-platform/services/token.service';
import { MessagingService as MetaMessagingService } from '../../modules/meta-platform/services/messaging.service';

// Import strategies
import { DirectMessageTriggerStrategy } from '../strategies/direct-message.strategy';
import { ReelCommentTriggerStrategy } from '../strategies/reel-comment.strategy';
import { PostCommentTriggerStrategy } from '../strategies/post-comment.strategy';
import { StoryReplyTriggerStrategy } from '../strategies/story-reply.strategy';
import { StoryMentionTriggerStrategy } from '../strategies/story-mention.strategy';

describe('Reel Comment to DM Integration E2E', () => {
  let controller: WebhookController;
  let automationRepo: AutomationRepository;
  let executionRepo: ExecutionRepository;
  let prisma: PrismaService;
  let executionEngine: ExecutionEngine;

  // Mock spies
  let mockMetaMessagingService: any;
  let mockMessagingServiceOld: any;
  let mockTokenService: any;
  let mockQueueService: any;
  let mockLockService: any;
  let mockMetricsService: any;

  beforeEach(async () => {
    // 1. Setup Prisma mock and database cleaner
    prisma = new PrismaService();
    await prisma.automationExecution.deleteMany({});
    await prisma.automation.deleteMany({});
    await prisma.processedEvent.deleteMany({});
    await prisma.instagramAsset.deleteMany({});
    await prisma.instagramAccount.deleteMany({});

    // Create the referenced Instagram account
    await prisma.instagramAccount.create({
      data: {
        id: 'instagram_account_123',
        instagramUserId: 'instagram_user_123',
        pageId: 'page_123',
        pageName: 'My page',
        accessTokenEncrypted: 'xyz123',
      },
    });

    // Create a mock asset so caption lookup succeeds
    await prisma.instagramAsset.create({
      data: {
        instagramAccountId: 'instagram_account_123',
        instagramMediaId: 'reel_123',
        assetType: 'REEL',
        caption: 'Latest black friday shoes!',
      },
    });

    // 2. Setup mock services
    mockMetaMessagingService = {
      sendPublicReply: jest.fn().mockResolvedValue({ commentId: 'comment_123', replyId: 'reply_555' }),
    };

    mockMessagingServiceOld = {
      send: jest.fn().mockResolvedValue({ success: true, messageId: 'msg_999' }),
    };

    mockTokenService = {
      getToken: jest.fn().mockResolvedValue('decrypted_access_token'),
    };

    mockQueueService = {
      enqueueExecuteAction: jest.fn(),
      enqueueDelayAction: jest.fn(),
    };

    mockLockService = {
      runWithLock: jest.fn().mockImplementation((key, ttl, fn) => fn()),
    };

    mockMetricsService = {
      incrementSuccess: jest.fn(),
      incrementDlq: jest.fn(),
      incrementFailure: jest.fn(),
      incrementRetry: jest.fn(),
    };

    // 3. Create NestJS Module
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        PrismaService,
        AutomationService,
        AutomationRepository,
        ExecutionRepository,
        ProcessedEventRepository,
        IdempotencyService,
        TriggerRegistry,
        TriggerResolver,
        ConditionEngine,
        VariableResolver,
        ActionStrategyResolver,
        SendMessageActionStrategy,
        WaitActionStrategy,
        AutomationConfig,
        
        // Trigger Strategies
        DirectMessageTriggerStrategy,
        ReelCommentTriggerStrategy,
        PostCommentTriggerStrategy,
        StoryReplyTriggerStrategy,
        StoryMentionTriggerStrategy,

        { provide: MetricsService, useValue: mockMetricsService },
        { provide: LockService, useValue: mockLockService },
        { provide: QueueService, useValue: mockQueueService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: MetaMessagingService, useValue: mockMetaMessagingService },
        { provide: 'MessagingService', useValue: mockMessagingServiceOld },
        {
          provide: ExecutionEngine,
          useFactory: (
            execRepo,
            autoRepo,
            condEngine,
            queueSvc,
            actionResolver,
            metricsSvc,
            config,
            tokenSvc,
            metaMsgSvc,
          ) => {
            const engine = new ExecutionEngine(
              execRepo,
              autoRepo,
              condEngine,
              queueSvc,
              actionResolver,
              metricsSvc,
              config,
              tokenSvc,
              metaMsgSvc,
            );
            executionEngine = engine;
            return engine;
          },
          inject: [
            ExecutionRepository,
            AutomationRepository,
            ConditionEngine,
            QueueService,
            ActionStrategyResolver,
            MetricsService,
            AutomationConfig,
            TokenService,
            MetaMessagingService,
          ],
        },
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
    automationRepo = module.get<AutomationRepository>(AutomationRepository);
    executionRepo = module.get<ExecutionRepository>(ExecutionRepository);

    // Mock BullMQ queue service to act synchronously and trigger execution step immediately
    mockQueueService.enqueueExecuteAction.mockImplementation(async (data: any) => {
      await executionEngine.executeStep(
        data.executionId,
        data.actionId,
        data.event,
        data.correlationId,
      );
    });
  });

  afterAll(async () => {
    await prisma.automationExecution.deleteMany({});
    await prisma.automation.deleteMany({});
    await prisma.processedEvent.deleteMany({});
    await prisma.instagramAsset.deleteMany({});
    await prisma.instagramAccount.deleteMany({});
    await prisma.$disconnect();
  });

  it('should successfully run the entire Reel Comment to DM pipeline end-to-end', async () => {
    // 1. Create target automation matching Reel comments containing "price"
    const automation = await automationRepo.create({
      instagramAccountId: 'instagram_account_123',
      name: 'Black Friday Reel Reply',
      enabled: true,
      triggerType: TriggerType.REEL_COMMENT,
      triggerConfig: {
        mediaScope: 'SPECIFIC_REEL',
        mediaId: 'reel_123',
        matchType: 'KEYWORD',
        keywords: ['price'],
        publicReply: 'Check your DM 😊',
      },
      conditions: [],
      actions: [
        {
          actionType: ActionType.SEND_MESSAGE,
          payload: {
            version: 1,
            type: 'SEND_MESSAGE',
            data: {
              text: 'Hey {{user.username}}! Thanks for commenting on our promo "{{reel.caption}}". Here is your discount code.',
            },
          },
        },
      ],
    });

    // 2. Draft the Webhook payload representing the user comments Event
    const commentPayload = {
      object: 'instagram',
      entry: [
        {
          id: 'instagram_account_123',
          time: Math.floor(Date.now() / 1000),
          changes: [
            {
              field: 'comments',
              value: {
                id: 'comment_abc123',
                text: 'How much is the price? Please!',
                media: {
                  id: 'reel_123',
                  media_product_type: 'REEL',
                },
                from: {
                  id: 'commenter_user_id',
                  username: 'john_customer',
                },
              },
            },
          ],
        },
      ],
    };

    // 3. Fire the controller webhook event trigger
    const response = await controller.handleEvent(commentPayload);
    expect(response.success).toBe(true);

    // 4. Validate output executions and database records
    const executions = await prisma.automationExecution.findMany({
      where: { automationId: automation.id },
      include: { logs: true },
    });

    expect(executions.length).toBe(1);
    const execution = executions[0];
    expect(execution.status).toBe(ExecutionStatus.SUCCESS);

    // Validate public comment reply was posted correctly via Meta Platform layer
    expect(mockMetaMessagingService.sendPublicReply).toHaveBeenCalledWith(
      'comment_abc123',
      'Check your DM 😊',
      'decrypted_access_token',
    );

    // Validate variables resolved and direct message sent
    expect(mockMessagingServiceOld.send).toHaveBeenCalledWith(
      expect.objectContaining({
        instagramAccountId: 'instagram_account_123',
        recipientInstagramId: 'commenter_user_id',
        messageText: 'Hey john_customer! Thanks for commenting on our promo "Latest black friday shoes!". Here is your discount code.',
        automationExecutionId: execution.id,
      }),
    );

    // Validate execution logging containing all requested parameters
    const startLog = execution.logs.find((l) => l.message.includes('[Trigger matched]'));
    expect(startLog).toBeDefined();
    
    const meta = startLog?.metadata as any;
    expect(meta.triggerMatched).toBe(true);
    expect(meta.matchedKeyword).toEqual(['price']);
    expect(meta.selectedReel).toBe('reel_123');
    expect(meta.commentId).toBe('comment_abc123');
    expect(meta.publicReplyStatus).toBe('SUCCESS');
    expect(meta.dmStatus).toBe('QUEUED');

    // 5. Test IDEMPOTENCY / Duplicate Webhook Protection
    // Fire the exact same event again
    const secondResponse = await controller.handleEvent(commentPayload);
    expect(secondResponse.success).toBe(true);

    // Expect no new executions were created
    const postExecutions = await prisma.automationExecution.findMany({
      where: { automationId: automation.id },
    });
    expect(postExecutions.length).toBe(1);
  });
});
