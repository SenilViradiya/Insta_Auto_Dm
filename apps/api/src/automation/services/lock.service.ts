import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class LockService implements OnModuleDestroy {
  private readonly logger = new Logger(LockService.name);
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
    });
  }

  async acquireLock(key: string, ttlMs: number): Promise<boolean> {
    try {
      const result = await this.redis.set(key, 'locked', 'PX', ttlMs, 'NX');
      return result === 'OK';
    } catch (error) {
      this.logger.error(`Failed to acquire lock for key ${key}:`, error);
      return false;
    }
  }

  async releaseLock(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Failed to release lock for key ${key}:`, error);
    }
  }

  async runWithLock<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>,
  ): Promise<T | null> {
    const acquired = await this.acquireLock(key, ttlMs);
    if (!acquired) {
      this.logger.warn(
        `[LockService] Collision detected. Failed to acquire lock for key: ${key}`,
      );
      return null;
    }
    try {
      return await fn();
    } finally {
      await this.releaseLock(key);
    }
  }

  async onModuleDestroy() {
    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    }
  }
}
