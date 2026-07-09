import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { MessagingConfig } from '../config/messaging.config';
import { RateLimitException } from '../exceptions/messaging.exceptions';

@Injectable()
export class MetaRateLimiterService {
  private readonly logger = new Logger(MetaRateLimiterService.name);
  private readonly redis: Redis;

  constructor(private readonly config: MessagingConfig) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
    });
  }

  /**
   * Sliding-window rate limiter per Instagram account.
   * Returns immediately if under limit. Throws RateLimitException if exceeded.
   */
  async acquire(instagramAccountId: string): Promise<void> {
    const key = `msg:ratelimit:${instagramAccountId}`;
    const now = Date.now();
    const windowMs = this.config.rateLimitWindowMs;
    const limit = this.config.rateLimit;

    try {
      // Remove entries older than the window
      await this.redis.zremrangebyscore(key, 0, now - windowMs);

      // Count current entries
      const currentCount = await this.redis.zcard(key);

      if (currentCount >= limit) {
        const oldestEntry = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
        const retryAfter =
          oldestEntry.length >= 2
            ? windowMs - (now - parseInt(oldestEntry[1], 10))
            : windowMs;

        this.logger.warn(
          `Rate limit exceeded for account ${instagramAccountId}: ${currentCount}/${limit} in ${windowMs}ms window`,
        );
        throw new RateLimitException(
          `Rate limit exceeded for account ${instagramAccountId}`,
          Math.max(retryAfter, 100),
        );
      }

      // Add current request
      const member = `${now}:${Math.random().toString(36).slice(2, 8)}`;
      await this.redis.zadd(key, now, member);
      await this.redis.pexpire(key, windowMs * 2);
    } catch (err) {
      if (err instanceof RateLimitException) throw err;
      // If Redis is down, allow the request through (fail-open)
      this.logger.warn(
        'Rate limiter Redis error, allowing request (fail-open)',
        err,
      );
    }
  }

  async getRemainingCapacity(instagramAccountId: string): Promise<number> {
    const key = `msg:ratelimit:${instagramAccountId}`;
    const now = Date.now();
    try {
      await this.redis.zremrangebyscore(
        key,
        0,
        now - this.config.rateLimitWindowMs,
      );
      const currentCount = await this.redis.zcard(key);
      return Math.max(0, this.config.rateLimit - currentCount);
    } catch {
      return this.config.rateLimit;
    }
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
