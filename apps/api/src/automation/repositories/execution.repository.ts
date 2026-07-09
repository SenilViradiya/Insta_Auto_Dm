import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ExecutionStatus } from '@prisma/client';
import { AutomationExecutionModel } from '../interfaces/repository.interfaces';
import { InfrastructureException } from '../errors/automation.errors';

@Injectable()
export class ExecutionRepository {
  private readonly logger = new Logger(ExecutionRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async createExecution(data: {
    automationId: string;
    eventId: string;
    status: ExecutionStatus;
  }): Promise<AutomationExecutionModel> {
    try {
      const record = await this.prisma.automationExecution.create({
        data: {
          automationId: data.automationId,
          eventId: data.eventId,
          status: data.status,
        },
      });

      return {
        id: record.id,
        automationId: record.automationId,
        eventId: record.eventId,
        status: record.status,
        startedAt: record.startedAt,
        completedAt: record.completedAt,
        durationMs: record.durationMs,
      };
    } catch (error: any) {
      this.logger.error(`Database failure in createExecution:`, error);
      throw new InfrastructureException(
        `Failed to create execution record: ${error.message}`,
      );
    }
  }

  async updateExecutionStatus(
    id: string,
    status: ExecutionStatus,
    completedAt?: Date,
    durationMs?: number,
  ): Promise<AutomationExecutionModel> {
    try {
      const record = await this.prisma.$transaction(async (tx: any) => {
        const current = await tx.automationExecution.findUnique({
          where: { id },
        });

        if (current) {
          const currentStatus = current.status as ExecutionStatus;
          if (
            currentStatus === ExecutionStatus.SUCCESS ||
            currentStatus === ExecutionStatus.FAILED ||
            currentStatus === ExecutionStatus.CANCELLED
          ) {
            return current;
          }
        }

        return tx.automationExecution.update({
          where: { id },
          data: {
            status,
            completedAt,
            durationMs,
          },
        });
      });

      return {
        id: record.id,
        automationId: record.automationId,
        eventId: record.eventId,
        status: record.status,
        startedAt: record.startedAt,
        completedAt: record.completedAt,
        durationMs: record.durationMs,
      };
    } catch (error: any) {
      this.logger.error(`Database failure in updateExecutionStatus:`, error);
      throw new InfrastructureException(
        `Failed to update execution status: ${error.message}`,
      );
    }
  }

  async createLog(data: {
    executionId: string;
    level: string;
    message: string;
    metadata: any;
    correlationId?: string;
  }): Promise<void> {
    try {
      const metadata = {
        ...data.metadata,
        correlationId: data.correlationId,
      };

      await this.prisma.automationLog.create({
        data: {
          executionId: data.executionId,
          level: data.level,
          message: data.message,
          metadata: metadata || {},
        },
      });
    } catch (error: any) {
      this.logger.error(`Database failure in createLog:`, error);
      throw new InfrastructureException(
        `Failed to persist automation execution log: ${error.message}`,
      );
    }
  }
}
