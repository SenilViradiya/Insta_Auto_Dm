import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { AutomationConfig } from '../config/automation.config';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('automation') private readonly queue: Queue,
    @InjectQueue('automation-dlq') private readonly dlq: Queue,
    private readonly config: AutomationConfig,
  ) {}

  async enqueueExecuteAction(data: {
    executionId: string;
    actionId: string;
    event: any;
    correlationId?: string;
  }) {
    this.logger.log(
      `Enqueuing execute-action job for action: ${data.actionId} (Execution: ${data.executionId}, CorrelationId: ${data.correlationId})`,
    );
    return this.queue.add('execute-action', data, {
      attempts: this.config.retryAttempts,
      backoff: {
        type: 'exponential',
        delay: this.config.retryBackoffDelayMs,
      },
    });
  }

  async enqueueDelayAction(
    data: {
      executionId: string;
      actionId: string;
      event: any;
      correlationId?: string;
    },
    delaySeconds: number,
  ) {
    this.logger.log(
      `Enqueuing delay-action job for action: ${data.actionId} with delay: ${delaySeconds}s (Execution: ${data.executionId}, CorrelationId: ${data.correlationId})`,
    );
    return this.queue.add('delay-action', data, {
      delay: delaySeconds * 1000,
      attempts: this.config.retryAttempts,
      backoff: {
        type: 'exponential',
        delay: this.config.retryBackoffDelayMs,
      },
    });
  }

  async enqueueRetryAction(data: {
    executionId: string;
    actionId: string;
    event: any;
    error: string;
    correlationId?: string;
  }) {
    this.logger.log(
      `Enqueuing retry-action job for action: ${data.actionId} (Execution: ${data.executionId})`,
    );
    return this.queue.add('retry-action', data, {
      attempts: 1,
    });
  }

  async enqueueDlq(data: {
    automationId: string;
    executionId: string;
    eventId: string;
    failureReason: string;
    retryCount: number;
    lastAttemptAt: Date;
    correlationId?: string;
  }) {
    this.logger.error(
      `[DLQ TRANSFER] Permanent execution failure. Enqueuing to automation-dlq: Execution: ${data.executionId}, Reason: ${data.failureReason}, CorrelationId: ${data.correlationId}`,
    );
    return this.dlq.add('failed-execution', data);
  }
}
