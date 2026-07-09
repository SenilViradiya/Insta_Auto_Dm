import { IdempotencyService } from '../services/idempotency.service';
import { LockService } from '../services/lock.service';
import { ExecutionRepository } from '../repositories/execution.repository';
import { ActionWorker } from '../workers/action.worker';
import { ExecutionStatus, ActionType } from '@prisma/client';
import {
  NonRetryableError,
  ValidationError,
} from '../errors/automation.errors';

describe('Production Hardening Service Suite', () => {
  describe('Idempotency Checking', () => {
    let idempotencyService: IdempotencyService;
    let mockProcessedEventRepo: any;

    beforeEach(() => {
      mockProcessedEventRepo = {
        exists: jest.fn(),
        create: jest.fn(),
      };
      idempotencyService = new IdempotencyService(mockProcessedEventRepo);
    });

    it('marks event processed successfully and returns true on first try', async () => {
      mockProcessedEventRepo.create.mockResolvedValue({ id: '1' });
      const marked = await idempotencyService.markProcessed(
        'evt-unique',
        'acc-1',
      );
      expect(marked).toBe(true);
      expect(mockProcessedEventRepo.create).toHaveBeenCalledWith(
        'evt-unique',
        'acc-1',
      );
    });

    it('returns false upon unique constraint collision (duplicate key)', async () => {
      const error: any = new Error('Duplicate');
      error.code = 'P2002';
      mockProcessedEventRepo.create.mockRejectedValue(error);

      const marked = await idempotencyService.markProcessed(
        'evt-double',
        'acc-1',
      );
      expect(marked).toBe(false);
    });
  });

  describe('Redis Distributed Lock', () => {
    let lockService: LockService;
    let mockSet: jest.Mock;
    let mockDel: jest.Mock;

    beforeEach(() => {
      lockService = new LockService();
      mockSet = jest.fn();
      mockDel = jest.fn();
      (lockService as any).redis = {
        set: mockSet,
        del: mockDel,
        quit: jest.fn().mockResolvedValue(undefined),
      };
    });

    it('acquires lock cleanly if redis returns OK', async () => {
      mockSet.mockResolvedValue('OK');
      const acquired = await lockService.acquireLock('lock-key', 5000);
      expect(acquired).toBe(true);
      expect(mockSet).toHaveBeenCalledWith(
        'lock-key',
        'locked',
        'PX',
        5000,
        'NX',
      );
    });

    it('denies lock if key already exists (NX failure)', async () => {
      mockSet.mockResolvedValue(null);
      const acquired = await lockService.acquireLock('lock-key', 5000);
      expect(acquired).toBe(false);
    });

    it('releases lock by deleting key', async () => {
      mockDel.mockResolvedValue(1);
      await lockService.releaseLock('lock-key');
      expect(mockDel).toHaveBeenCalledWith('lock-key');
    });

    it('runs execution code safely with automatic lock release', async () => {
      mockSet.mockResolvedValue('OK');
      mockDel.mockResolvedValue(1);
      const callback = jest.fn().mockResolvedValue('callback-value');

      const result = await lockService.runWithLock('lock-key', 2000, callback);
      expect(result).toBe('callback-value');
      expect(callback).toHaveBeenCalled();
      expect(mockDel).toHaveBeenCalledWith('lock-key');
    });
  });

  describe('Execution Status Transitions & Validation', () => {
    let executionRepo: ExecutionRepository;
    let mockTx: any;

    beforeEach(() => {
      mockTx = {
        automationExecution: {
          findUnique: jest.fn(),
          update: jest.fn(),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation((cb) => cb(mockTx)),
      } as any;
      executionRepo = new ExecutionRepository(mockPrisma);
    });

    it('prevents transitioning if current status is SUCCESS (final state)', async () => {
      mockTx.automationExecution.findUnique.mockResolvedValue({
        id: 'exe-1',
        status: ExecutionStatus.SUCCESS,
      });

      await executionRepo.updateExecutionStatus(
        'exe-1',
        ExecutionStatus.FAILED,
      );
      expect(mockTx.automationExecution.update).not.toHaveBeenCalled();
    });

    it('allows valid state changes (e.g. RUNNING to WAITING)', async () => {
      mockTx.automationExecution.findUnique.mockResolvedValue({
        id: 'exe-1',
        status: ExecutionStatus.RUNNING,
      });
      mockTx.automationExecution.update.mockResolvedValue({
        id: 'exe-1',
        status: ExecutionStatus.WAITING,
      });

      const updated = await executionRepo.updateExecutionStatus(
        'exe-1',
        ExecutionStatus.WAITING,
      );
      expect(updated.status).toBe(ExecutionStatus.WAITING);
      expect(mockTx.automationExecution.update).toHaveBeenCalled();
    });
  });

  describe('Retry Policy & Dead Letter Queue (DLQ)', () => {
    let actionWorker: ActionWorker;
    let mockActionDispatcher: any;
    let mockExecutionRepo: any;
    let mockAutomationRepo: any;
    let mockQueueService: any;
    let mockMetricsService: any;

    beforeEach(() => {
      mockActionDispatcher = { dispatch: jest.fn() };
      mockExecutionRepo = {
        updateExecutionStatus: jest.fn(),
        createLog: jest.fn(),
      };
      mockAutomationRepo = {
        findMany: jest.fn().mockResolvedValue({
          items: [
            {
              id: 'auto-1',
              actions: [
                {
                  id: 'act-1',
                  actionType: ActionType.SEND_MESSAGE,
                  payload: {
                    version: 1,
                    type: 'SEND_MESSAGE',
                    data: { text: 'Hello' },
                  },
                },
              ],
            },
          ],
        }),
      };
      mockQueueService = {
        enqueueDlq: jest.fn(),
      };
      mockMetricsService = {
        incrementDlq: jest.fn(),
        incrementFailure: jest.fn(),
        incrementRetry: jest.fn(),
      };

      const mockConfig = {
        retryAttempts: 3,
        slowExecutionThresholdMs: 1000,
      } as any;

      actionWorker = new ActionWorker(
        mockActionDispatcher,
        mockExecutionRepo,
        mockAutomationRepo,
        mockQueueService,
        mockMetricsService,
        mockConfig,
      );
    });

    it('sends execution to DLQ on non-retryable ValidationError immediately', async () => {
      mockActionDispatcher.dispatch.mockRejectedValue(
        new ValidationError('Invalid structure'),
      );
      const mockJob: any = {
        id: 'job-1',
        name: 'execute-action',
        data: {
          executionId: 'exe-1',
          actionId: 'act-1',
          event: { eventId: 'evt-1', instagramAccountId: 'acc-1' },
        },
        attemptsMade: 1,
        opts: { attempts: 3 },
      };

      await expect(actionWorker.process(mockJob)).resolves.not.toThrow();

      expect(mockQueueService.enqueueDlq).toHaveBeenCalledWith({
        automationId: 'auto-1',
        executionId: 'exe-1',
        eventId: 'evt-1',
        failureReason: 'Invalid structure',
        retryCount: 1,
        lastAttemptAt: expect.any(Date),
      });
      expect(mockMetricsService.incrementDlq).toHaveBeenCalled();
      expect(mockExecutionRepo.updateExecutionStatus).toHaveBeenCalledWith(
        'exe-1',
        ExecutionStatus.FAILED,
        expect.any(Date),
      );
    });

    it('sends execution to DLQ after exhausting attempts', async () => {
      mockActionDispatcher.dispatch.mockRejectedValue(
        new Error('Network error'),
      );
      const mockJob: any = {
        id: 'job-1',
        name: 'execute-action',
        data: {
          executionId: 'exe-1',
          actionId: 'act-1',
          event: { eventId: 'evt-1', instagramAccountId: 'acc-1' },
        },
        attemptsMade: 3,
        opts: { attempts: 3 },
      };

      await expect(actionWorker.process(mockJob)).resolves.not.toThrow();

      expect(mockQueueService.enqueueDlq).toHaveBeenCalledWith({
        automationId: 'auto-1',
        executionId: 'exe-1',
        eventId: 'evt-1',
        failureReason: 'Network error',
        retryCount: 3,
        lastAttemptAt: expect.any(Date),
      });
    });

    it('logs warning and lets job propagate error to retry if attempts remains', async () => {
      mockActionDispatcher.dispatch.mockRejectedValue(
        new Error('Network error'),
      );
      const mockJob: any = {
        id: 'job-1',
        name: 'execute-action',
        data: {
          executionId: 'exe-1',
          actionId: 'act-1',
          event: { eventId: 'evt-1', instagramAccountId: 'acc-1' },
        },
        attemptsMade: 1,
        opts: { attempts: 3 },
      };

      await expect(actionWorker.process(mockJob)).rejects.toThrow(
        'Network error',
      );
      expect(mockQueueService.enqueueDlq).not.toHaveBeenCalled();
      expect(mockMetricsService.incrementRetry).toHaveBeenCalled();
    });
  });
});
