import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../../../prisma.service';
import { MetaPlatformConfig } from '../config/meta-platform.config';
import { TokenExpiredException } from '../exceptions/meta.exceptions';
import { decryptToken } from '../utils/crypto.utils';
import { createRedisClient } from '../../../config/redis.config';

@Injectable()
export class TokenService implements OnModuleDestroy {
  private readonly logger = new Logger(TokenService.name);
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: MetaPlatformConfig,
  ) {
    this.redis = createRedisClient({
      lazyConnect: true,
    });
  }

  async getToken(instagramAccountId: string): Promise<string> {
    const cacheKey = `meta:token:${instagramAccountId}`;

    // 1. Read cache
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Token cache HIT for account ${instagramAccountId}`);
        return cached;
      }
    } catch (err) {
      this.logger.warn('Redis cache read failed, falling back to DB', err);
    }

    // 2. Query DB
    const account = await this.prisma.instagramAccount.findFirst({
      where: {
        OR: [
          { id: instagramAccountId },
          { instagramUserId: instagramAccountId },
        ],
      },
    });

    if (!account) {
      throw new TokenExpiredException(
        `No Instagram account found for ID: ${instagramAccountId}`,
      );
    }

    // 3. Expiry Check
    if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
      throw new TokenExpiredException(
        `Token expired at ${account.tokenExpiresAt.toISOString()} for account ${instagramAccountId}`,
      );
    }

    // 4. Decrypt
    const decrypted = decryptToken(
      account.accessTokenEncrypted,
      this.config.tokenEncryptionKey,
    );

    // 5. Cache write
    try {
      // Cache for 1 hour by default
      await this.redis.set(cacheKey, decrypted, 'EX', 3600);
    } catch (err) {
      this.logger.warn('Redis cache write failed', err);
    }

    return decrypted;
  }

  async invalidateCache(instagramAccountId: string): Promise<void> {
    try {
      await this.redis.del(`meta:token:${instagramAccountId}`);
    } catch (err) {
      this.logger.warn('Redis cache invalidation failed', err);
    }
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
