import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  private durations: number[] = [];
  private readonly maxWindowSize = 1000;

  private retryCount = 0;
  private dlqCount = 0;

  constructor(
    @InjectQueue('automation') private readonly queue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  incrementSuccess(executionTimeMs: number) {
    this.durations.push(executionTimeMs);
    if (this.durations.length > this.maxWindowSize) {
      this.durations.shift();
    }
  }

  incrementRetry() {
    this.retryCount++;
  }

  incrementDlq() {
    this.dlqCount++;
  }

  private failureCount = 0;
  incrementFailure() {
    this.failureCount++;
  }

  private getPercentile(p: number): number {
    if (this.durations.length === 0) return 0;
    const sorted = [...this.durations].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  async getMetrics() {
    let running = 0;
    let queued = 0;
    let waiting = 0;
    let failed = 0;
    let cancelled = 0;
    let success = 0;

    try {
      const counts = await this.prisma.automationExecution.groupBy({
        by: ['status'],
        _count: {
          id: true,
        },
      });

      for (const item of counts) {
        const count = item._count.id;
        switch (item.status) {
          case 'RUNNING':
            running = count;
            break;
          case 'QUEUED':
            queued = count;
            break;
          case 'WAITING':
            waiting = count;
            break;
          case 'FAILED':
            failed = count;
            break;
          case 'CANCELLED':
            cancelled = count;
            break;
          case 'SUCCESS':
            success = count;
            break;
        }
      }
    } catch (error) {
      this.logger.debug('Failed to count statuses in database:', error);
    }

    let queueSize = 0;
    let activeQueueCount = 0;
    try {
      if (this.queue && typeof this.queue.getJobCounts === 'function') {
        const counts = await this.queue.getJobCounts(
          'active',
          'waiting',
          'delayed',
        );
        activeQueueCount = counts.active || 0;
        queueSize =
          (counts.active || 0) + (counts.waiting || 0) + (counts.delayed || 0);
      }
    } catch (error) {
      this.logger.debug('Could not retrieve BullMQ job counts:', error);
    }

    const totalExecutions =
      running + queued + waiting + failed + cancelled + success;

    const totalDuration = this.durations.reduce((a, b) => a + b, 0);
    const averageDuration =
      this.durations.length > 0 ? totalDuration / this.durations.length : 0;

    return {
      totalExecutions,
      successCount: success,
      runningCount: running,
      queuedCount: queued,
      waitingCount: waiting,
      failedCount: failed,
      cancelledCount: cancelled,
      averageExecutionTimeMs: averageDuration,
      p95ExecutionTimeMs: this.getPercentile(95),
      p99ExecutionTimeMs: this.getPercentile(99),
      queueSize,
      retryCount: this.retryCount,
      dlqCount: this.dlqCount,
      workerUtilizationPercentage:
        activeQueueCount > 0
          ? Math.min(100, Math.round((activeQueueCount / 10) * 100))
          : 0,
    };
  }
}
