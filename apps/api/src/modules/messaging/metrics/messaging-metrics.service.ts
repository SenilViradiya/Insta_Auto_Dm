import { Injectable } from '@nestjs/common';

@Injectable()
export class MessagingMetricsService {
  private sentCount = 0;
  private failedCount = 0;
  private retryCount = 0;
  private rateLimitHits = 0;
  private tokenErrors = 0;
  private networkErrors = 0;

  private durations: number[] = [];
  private readonly maxWindowSize = 1000;

  incrementSent(durationMs: number) {
    this.sentCount++;
    this.durations.push(durationMs);
    if (this.durations.length > this.maxWindowSize) {
      this.durations.shift();
    }
  }

  incrementFailed() {
    this.failedCount++;
  }

  incrementRetry() {
    this.retryCount++;
  }

  incrementRateLimitHit() {
    this.rateLimitHits++;
  }

  incrementTokenError() {
    this.tokenErrors++;
  }

  incrementNetworkError() {
    this.networkErrors++;
  }

  private getPercentile(p: number): number {
    if (this.durations.length === 0) return 0;
    const sorted = [...this.durations].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  getMetrics() {
    const totalDuration = this.durations.reduce((a, b) => a + b, 0);
    const averageSendTimeMs =
      this.durations.length > 0 ? totalDuration / this.durations.length : 0;

    return {
      messagesSent: this.sentCount,
      messagesFailed: this.failedCount,
      retries: this.retryCount,
      averageSendTimeMs: Math.round(averageSendTimeMs),
      p95SendTimeMs: this.getPercentile(95),
      p99SendTimeMs: this.getPercentile(99),
      rateLimitHits: this.rateLimitHits,
      tokenErrors: this.tokenErrors,
      networkErrors: this.networkErrors,
    };
  }
}
