import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { getRedisConfig } from './redis.config';
import { validateConfig } from './env-validator';

const logger = new Logger('StartupValidation');

export async function validateStartup(): Promise<void> {
  // 1. Centralized config validation (env vars)
  logger.log('Validating configuration environment variables...');
  validateConfig();

  // 2. Database reachability check
  logger.log('Verifying Database reachability...');
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
  try {
    await prisma.$connect();
    // Execute a simple query to verify fully queryable database connection
    await prisma.$executeRawUnsafe('SELECT 1;');
    logger.log('Database verification succeeded.');
  } catch (error) {
    const errorMsg = `DATABASE REACHABILITY ERROR: Could not connect to the database. Please verify your DATABASE_URL is correct and the PostgreSQL server is running. Detail: ${(error as Error).message}`;
    logger.error(errorMsg);
    process.exit(1);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }

  // 3. Redis reachability check
  logger.log('Verifying Redis reachability...');
  const redisConfig = getRedisConfig({
    maxRetriesPerRequest: 1, // Fail fast on startup check
    connectTimeout: 5000,
  });

  let redis: Redis | null = null;
  try {
    if (process.env.REDIS_URL) {
      redis = new Redis(process.env.REDIS_URL, redisConfig);
    } else {
      redis = new Redis(redisConfig);
    }

    const pingResult = await redis.ping();
    if (pingResult !== 'PONG') {
      throw new Error(`Unexpected ping response: ${pingResult}`);
    }
    logger.log('Redis verification succeeded.');
  } catch (error) {
    const errorMsg = `REDIS REACHABILITY ERROR: Could not connect to Redis. Please verify your REDIS_URL or REDIS_HOST/REDIS_PORT settings, and make sure Redis is running. Detail: ${(error as Error).message}`;
    logger.error(errorMsg);
    process.exit(1);
  } finally {
    if (redis) {
      await redis.quit().catch(() => {});
    }
  }
}
