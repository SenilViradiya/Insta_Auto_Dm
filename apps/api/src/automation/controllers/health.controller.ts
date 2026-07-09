import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../prisma.service';
import { LockService } from '../services/lock.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: LockService,
    @InjectQueue('automation') private readonly queue: Queue,
  ) {}

  @Get()
  async getOverallHealth(@Res() res: Response) {
    const dbStatus = await this.checkDatabase();
    const redisStatus = await this.checkRedis();
    const queueStatus = await this.checkQueue();

    const isHealthy =
      dbStatus === 'up' && redisStatus === 'up' && queueStatus === 'up';

    const payload = {
      status: isHealthy ? 'up' : 'down',
      timestamp: new Date().toISOString(),
      details: {
        database: dbStatus,
        redis: redisStatus,
        queue: queueStatus,
      },
    };

    return res
      .status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json(payload);
  }

  @Get('database')
  async getDatabaseHealth(@Res() res: Response) {
    const dbStatus = await this.checkDatabase();
    const isHealthy = dbStatus === 'up';
    return res
      .status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json({ status: dbStatus });
  }

  @Get('redis')
  async getRedisHealth(@Res() res: Response) {
    const redisStatus = await this.checkRedis();
    const isHealthy = redisStatus === 'up';
    return res
      .status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json({ status: redisStatus });
  }

  @Get('queue')
  async getQueueHealth(@Res() res: Response) {
    const queueStatus = await this.checkQueue();
    const isHealthy = queueStatus === 'up';
    return res
      .status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json({ status: queueStatus });
  }

  private async checkDatabase(): Promise<'up' | 'down'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<'up' | 'down'> {
    try {
      const client = (this.lockService as any).redis;
      if (client && client.status === 'ready') {
        return 'up';
      }
      const ping = await client.ping();
      return ping === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }

  private async checkQueue(): Promise<'up' | 'down'> {
    try {
      if (this.queue) {
        const client = (this.queue as any).client;
        if (client && typeof client.ping === 'function') {
          await client.ping();
        }
        return 'up';
      }
      return 'down';
    } catch {
      return 'down';
    }
  }
}
