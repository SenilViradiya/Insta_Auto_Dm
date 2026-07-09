import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('automation') private readonly queue: Queue,
    @InjectQueue('automation-dlq') private readonly dlq: Queue,
  ) {}

  async enqueueExecuteAction(data: {
    executionId: string;
    actionId: string;
    event: any;
  }) {
    this.logger.log(
      `Enqueuing execute-action job for action: ${data.actionId} (Execution: ${data.executionId})`,
    );
    return this.queue.add('execute-action', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }

  async enqueueDelayAction(
    data: {
      executionId: string;
      actionId: string;
      event: any;
    },
    delaySeconds: number,
  ) {
    this.logger.log(
      `Enqueuing delay-action job for action: ${data.actionId} with delay: ${delaySeconds}s (Execution: ${data.executionId})`,
    );
    return this.queue.add('delay-action', data, {
      delay: delaySeconds * 1000,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }

  async enqueueRetryAction(data: {
    executionId: string;
    actionId: string;
    event: any;
    error: string;
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
  }) {
    this.logger.error(
      `[DLQ TRANSFER] Permanent execution failure. Enqueuing to automation-dlq: Execution: ${data.executionId}, Reason: ${data.failureReason}`,
    );
    return this.dlq.add('failed-execution', data);
  }
}
