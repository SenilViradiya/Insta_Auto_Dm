import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ExecutionStatus, Prisma } from '@prisma/client';
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
    } catch (error) {
      this.logger.error(`Database failure in createExecution:`, error);
      throw new InfrastructureException(
        `Failed to create execution record: ${(error as Error).message}`,
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
      const record = await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const current = await tx.automationExecution.findUnique({
            where: { id },
          });

          if (current) {
            const currentStatus = current.status;
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
        },
      );

      return {
        id: record.id,
        automationId: record.automationId,
        eventId: record.eventId,
        status: record.status,
        startedAt: record.startedAt,
        completedAt: record.completedAt,
        durationMs: record.durationMs,
      };
    } catch (error) {
      this.logger.error(`Database failure in updateExecutionStatus:`, error);
      throw new InfrastructureException(
        `Failed to update execution status: ${(error as Error).message}`,
      );
    }
  }

  async createLog(data: {
    executionId: string;
    level: string;
    message: string;
    metadata: unknown;
    correlationId?: string;
  }): Promise<void> {
    try {
      const metadata = {
        ...(typeof data.metadata === 'object' && data.metadata !== null
          ? data.metadata
          : {}),
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
    } catch (error) {
      this.logger.error(`Database failure in createLog:`, error);
      throw new InfrastructureException(
        `Failed to persist automation execution log: ${(error as Error).message}`,
      );
    }
  }

  async findMany(filters: {
    status?: ExecutionStatus;
    automationId?: string;
    skip?: number;
    take?: number;
  }): Promise<{ items: any[]; total: number }> {
    try {
      const where: Prisma.AutomationExecutionWhereInput = {};
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.automationId) {
        where.automationId = filters.automationId;
      }

      const [items, total] = await Promise.all([
        this.prisma.automationExecution.findMany({
          where,
          orderBy: { startedAt: 'desc' },
          skip: filters.skip || 0,
          take: filters.take || 10,
          include: {
            automation: true,
          },
        }),
        this.prisma.automationExecution.count({ where }),
      ]);

      return { items, total };
    } catch (error) {
      this.logger.error(`Database failure in findMany:`, error);
      throw new InfrastructureException(
        `Failed to retrieve execution records: ${(error as Error).message}`,
      );
    }
  }

  async findById(id: string): Promise<any | null> {
    try {
      return await this.prisma.automationExecution.findUnique({
        where: { id },
        include: {
          automation: true,
        },
      });
    } catch (error) {
      this.logger.error(`Database failure in findById:`, error);
      throw new InfrastructureException(
        `Failed to retrieve execution record: ${(error as Error).message}`,
      );
    }
  }

  async findLogs(executionId: string): Promise<any[]> {
    try {
      return await this.prisma.automationLog.findMany({
        where: { executionId },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      this.logger.error(`Database failure in findLogs:`, error);
      throw new InfrastructureException(
        `Failed to retrieve execution logs: ${(error as Error).message}`,
      );
    }
  }
}
