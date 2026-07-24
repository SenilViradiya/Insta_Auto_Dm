import { Logger } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';
import { URL } from 'url';

const logger = new Logger('RedisConfig');

export function validateRedisEnv(): void {
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST;

  if (!redisUrl && !redisHost) {
    const errorMsg =
      'Startup Error: Neither REDIS_URL nor REDIS_HOST is configured in environment variables.';
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }
}

export function getRedisConfig(options: RedisOptions = {}): RedisOptions {
  validateRedisEnv();

  const redisUrl = process.env.REDIS_URL;
  const defaultRetryStrategy = (times: number) => {
    return Math.min(times * 1000 + 1000, 15000);
  };

  if (redisUrl) {
    try {
      const parsed = new URL(redisUrl);
      const config: RedisOptions = {
        host: parsed.hostname,
        port: parsed.port ? parseInt(parsed.port, 10) : 6379,
        password: parsed.password
          ? decodeURIComponent(parsed.password)
          : undefined,
        username: parsed.username
          ? decodeURIComponent(parsed.username)
          : undefined,
        retryStrategy: defaultRetryStrategy,
        ...options,
      };

      if (redisUrl.startsWith('rediss://')) {
        config.tls = {
          rejectUnauthorized: false,
          ...options.tls,
        };
      }

      return config;
    } catch (err) {
      logger.warn(
        `Failed to parse REDIS_URL cleanly: ${String(err)}. Using raw url fallback.`,
      );
    }
  }

  // Fallback to host/port/password
  const host = process.env.REDIS_HOST ?? 'localhost';
  const port = parseInt(process.env.REDIS_PORT ?? '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;

  return {
    host,
    port,
    password,
    retryStrategy: defaultRetryStrategy,
    ...options,
  };
}

export function createRedisClient(options: RedisOptions = {}): Redis {
  validateRedisEnv();
  const redisUrl = process.env.REDIS_URL;

  // Sensible exponential backoff to avoid spamming Upstash/Redis on connection drop or limit block
  const retryStrategy = (times: number) => {
    const delay = Math.min(times * 1000 + 1000, 15000);
    logger.warn(`Redis connection retry attempt #${times}. Reconnecting in ${delay}ms...`);
    return delay;
  };

  const config = getRedisConfig({
    retryStrategy,
    ...options,
  });

  const client = redisUrl ? new Redis(redisUrl, config) : new Redis(config);

  // Safeguard: Register error listener to avoid 'Unhandled error event' throwing and crashing
  client.on('error', (err) => {
    logger.error(`Redis Client connection error: ${err.message}`);
  });

  return client;
}
