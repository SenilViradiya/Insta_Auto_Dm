import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../../../prisma.service';
import { MessagingConfig } from '../config/messaging.config';
import { TokenExpiredException } from '../exceptions/messaging.exceptions';
import { decryptToken } from '../../../meta/crypto.utils';
import { TokenInfo } from '../interfaces/messaging.interfaces';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: MessagingConfig,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
    });
  }

  async getToken(instagramAccountId: string): Promise<string> {
    // 1. Check Redis cache
    const cacheKey = `msg:token:${instagramAccountId}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Token cache HIT for account ${instagramAccountId}`);
        return cached;
      }
    } catch (err) {
      this.logger.warn('Redis cache read failed, falling back to DB', err);
    }

    // 2. Load from database
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

    // 3. Check expiration
    if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
      throw new TokenExpiredException(
        `Token expired at ${account.tokenExpiresAt.toISOString()} for account ${instagramAccountId}`,
      );
    }

    // 4. Decrypt
    const decrypted = decryptToken(
      account.accessTokenEncrypted,
      this.config.encryptionKey,
    );

    // 5. Cache in Redis
    try {
      await this.redis.set(
        cacheKey,
        decrypted,
        'EX',
        this.config.tokenCacheTtlSeconds,
      );
    } catch (err) {
      this.logger.warn('Redis cache write failed', err);
    }

    return decrypted;
  }

  async invalidateCache(instagramAccountId: string): Promise<void> {
    try {
      await this.redis.del(`msg:token:${instagramAccountId}`);
    } catch (err) {
      this.logger.warn('Redis cache invalidation failed', err);
    }
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
