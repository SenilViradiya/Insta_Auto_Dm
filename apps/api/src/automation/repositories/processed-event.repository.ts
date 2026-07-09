import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ProcessedEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async exists(eventId: string): Promise<boolean> {
    const record = await this.prisma.processedEvent.findUnique({
      where: { eventId },
    });
    return record !== null;
  }

  async create(eventId: string, instagramAccountId: string) {
    return this.prisma.processedEvent.create({
      data: {
        eventId,
        instagramAccountId,
      },
    });
  }
}
