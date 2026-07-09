import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ExecutionStatus } from '@prisma/client';

@Injectable()
export class ExecutionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createExecution(data: {
    automationId: string;
    eventId: string;
    status: ExecutionStatus;
  }) {
    return this.prisma.automationExecution.create({
      data: {
        automationId: data.automationId,
        eventId: data.eventId,
        status: data.status,
      },
    });
  }

  async updateExecutionStatus(
    id: string,
    status: ExecutionStatus,
    completedAt?: Date,
    durationMs?: number,
  ) {
    // Prevent invalid states transitions manually to harden reliability
    return this.prisma.$transaction(async (tx: any) => {
      const current = await tx.automationExecution.findUnique({
        where: { id },
      });

      if (current) {
        const currentStatus = current.status as ExecutionStatus;
        // Do not allow transitioning out of final states: SUCCESS, FAILED, CANCELLED
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
  }

  async createLog(data: {
    executionId: string;
    level: string;
    message: string;
    metadata: any;
  }) {
    return this.prisma.automationLog.create({
      data: {
        executionId: data.executionId,
        level: data.level,
        message: data.message,
        metadata: data.metadata,
      },
    });
  }
}
