import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { InfrastructureException } from '../errors/automation.errors';

@Injectable()
export class ProcessedEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async exists(eventId: string): Promise<boolean> {
    try {
      const record = await this.prisma.processedEvent.findUnique({
        where: { eventId },
      });
      return record !== null;
    } catch (error) {
      const err = error as Error & { code?: string };
      throw new InfrastructureException(err.message, err.code);
    }
  }

  async create(eventId: string, instagramAccountId: string): Promise<void> {
    try {
      await this.prisma.processedEvent.create({
        data: {
          eventId,
          instagramAccountId,
        },
      });
    } catch (error) {
      const err = error as Error & { code?: string };
      throw new InfrastructureException(err.message, err.code);
    }
  }
}
