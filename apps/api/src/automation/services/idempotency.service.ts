import { Injectable, Logger } from '@nestjs/common';
import { ProcessedEventRepository } from '../repositories/processed-event.repository';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(private readonly repo: ProcessedEventRepository) {}

  async checkProcessed(eventId: string): Promise<boolean> {
    return this.repo.exists(eventId);
  }

  async markProcessed(
    eventId: string,
    instagramAccountId: string,
  ): Promise<boolean> {
    try {
      await this.repo.create(eventId, instagramAccountId);
      this.logger.debug(
        `Successfully logged idempotency key for eventId ${eventId}`,
      );
      return true;
    } catch (error: any) {
      // Prisma code for unique key violation is P2002
      if (error && error.code === 'P2002') {
        this.logger.warn(
          `Attempted duplicate processing for already logged eventId ${eventId}`,
        );
        return false;
      }
      this.logger.error(
        `Failed to persist idempotency key for eventId ${eventId}:`,
        error,
      );
      throw error;
    }
  }
}
