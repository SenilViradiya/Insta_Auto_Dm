import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Automation, TriggerType, Operator, ActionType } from '@prisma/client';

@Injectable()
export class AutomationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(filters: {
    instagramAccountId?: string;
    workspaceId?: string;
    enabled?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      instagramAccountId,
      workspaceId,
      enabled,
      search,
      page = 1,
      limit = 10,
    } = filters;
    const skip = (page - 1) * limit;

    const accountId = instagramAccountId || workspaceId || 'default';
    const where: any = { instagramAccountId: accountId };

    if (enabled !== undefined) {
      where.enabled = enabled;
    }
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [total, items] = await Promise.all([
      this.prisma.automation.count({ where }),
      this.prisma.automation.findMany({
        where,
        include: {
          triggers: true,
          conditions: true,
          actions: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { total, items };
  }

  async findUnique(id: string) {
    return this.prisma.automation.findUnique({
      where: { id },
      include: {
        triggers: true,
        conditions: true,
        actions: true,
      },
    });
  }

  async create(data: {
    instagramAccountId?: string;
    workspaceId?: string;
    name: string;
    description?: string;
    enabled?: boolean;
    triggerType?: TriggerType;
    triggers: Array<{ eventType: TriggerType; enabled?: boolean }>;
    conditions: Array<{ field: string; operator: Operator; value: string }>;
    actions: Array<{ actionType: ActionType; payload: any }>;
  }) {
    const accountId = data.instagramAccountId || data.workspaceId || 'default';

    return this.prisma.$transaction(async (tx: any) => {
      return tx.automation.create({
        data: {
          instagramAccountId: accountId,
          name: data.name,
          description: data.description,
          enabled: data.enabled ?? true,
          triggerType: data.triggerType,
          triggers: {
            create: data.triggers,
          },
          conditions: {
            create: data.conditions,
          },
          actions: {
            create: data.actions.map((act) => ({
              actionType: act.actionType,
              payload: act.payload,
            })),
          },
        },
        include: {
          triggers: true,
          conditions: true,
          actions: true,
        },
      });
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      enabled?: boolean;
      triggerType?: TriggerType;
      triggers?: Array<{ eventType: TriggerType; enabled?: boolean }>;
      conditions?: Array<{ field: string; operator: Operator; value: string }>;
      actions?: Array<{ actionType: ActionType; payload: any }>;
    },
  ) {
    return this.prisma.$transaction(async (tx: any) => {
      // If triggers are provided, replace them atomically
      if (data.triggers) {
        await tx.automationTrigger.deleteMany({ where: { automationId: id } });
      }
      // If conditions are provided, replace them atomically
      if (data.conditions) {
        await tx.automationCondition.deleteMany({
          where: { automationId: id },
        });
      }
      // If actions are provided, replace them atomically
      if (data.actions) {
        await tx.automationAction.deleteMany({ where: { automationId: id } });
      }

      return tx.automation.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          enabled: data.enabled,
          triggerType: data.triggerType,
          triggers: data.triggers ? { create: data.triggers } : undefined,
          conditions: data.conditions ? { create: data.conditions } : undefined,
          actions: data.actions ? { create: data.actions } : undefined,
        },
        include: {
          triggers: true,
          conditions: true,
          actions: true,
        },
      });
    });
  }

  async delete(id: string) {
    return this.prisma.automation.delete({
      where: { id },
    });
  }

  async findMatchingAutomations(
    eventType: TriggerType,
    instagramAccountId: string,
  ) {
    return this.prisma.automation.findMany({
      where: {
        instagramAccountId,
        enabled: true,
        triggers: {
          some: {
            eventType,
            enabled: true,
          },
        },
      },
      include: {
        triggers: true,
        conditions: true,
        actions: true,
      },
    });
  }
}
