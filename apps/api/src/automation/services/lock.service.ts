import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { createRedisClient } from '../../config/redis.config';

@Injectable()
export class LockService implements OnModuleDestroy {
  private readonly logger = new Logger(LockService.name);
  private readonly redis: Redis;

  constructor() {
    this.redis = createRedisClient({
      maxRetriesPerRequest: null,
    });
  }

  async acquireLock(key: string, ttlMs: number, value: string = 'locked'): Promise<boolean> {
    try {
      const result = await this.redis.set(key, value, 'PX', ttlMs, 'NX');
      return result === 'OK';
    } catch (error) {
      this.logger.error(`Failed to acquire lock for key ${key}:`, error);
      return false;
    }
  }

  async releaseLock(key: string, value: string = 'locked'): Promise<void> {
    try {
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      await this.redis.eval(luaScript, 1, key, value);
    } catch (error) {
      this.logger.error(`Failed to release lock for key ${key}:`, error);
    }
  }

  async runWithLock<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>,
  ): Promise<T | null> {
    const token = Math.random().toString(36).substring(2, 15) + Date.now();
    const acquired = await this.acquireLock(key, ttlMs, token);
    if (!acquired) {
      this.logger.warn(
        `[LockService] Collision detected. Failed to acquire lock for key: ${key}`,
      );
      return null;
    }
    try {
      return await fn();
    } finally {
      await this.releaseLock(key, token);
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

