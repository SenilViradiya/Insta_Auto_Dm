import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  private successCount = 0;
  private failureCount = 0;
  private totalExecutionTimeMs = 0;
  private totalExecutions = 0;
  private retryCount = 0;
  private dlqCount = 0;

  constructor(@InjectQueue('automation') private readonly queue: Queue) {}

  incrementSuccess(executionTimeMs: number) {
    this.successCount++;
    this.totalExecutions++;
    this.totalExecutionTimeMs += executionTimeMs;
  }

  incrementFailure() {
    this.failureCount++;
    this.totalExecutions++;
  }

  incrementRetry() {
    this.retryCount++;
  }

  incrementDlq() {
    this.dlqCount++;
  }

  async getMetrics() {
    let queueSize = 0;
    try {
      if (this.queue && typeof this.queue.getJobCounts === 'function') {
        const counts = await this.queue.getJobCounts(
          'active',
          'waiting',
          'delayed',
        );
        queueSize =
          (counts.active || 0) + (counts.waiting || 0) + (counts.delayed || 0);
      }
    } catch (error) {
      this.logger.debug('Could not retrieve BullMQ job counts:', error);
    }

    return {
      totalExecutions: this.totalExecutions,
      successCount: this.successCount,
      failureCount: this.failureCount,
      averageExecutionTimeMs:
        this.totalExecutions > 0
          ? this.totalExecutionTimeMs / this.totalExecutions
          : 0,
      queueSize,
      retryCount: this.retryCount,
      dlqCount: this.dlqCount,
    };
  }
}
