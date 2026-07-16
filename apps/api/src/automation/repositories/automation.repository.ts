import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { TriggerType, Operator, ActionType, Prisma } from '@prisma/client';
import { AutomationModel } from '../interfaces/repository.interfaces';
import { normalizePayload } from '../dto/action-payload.validator';
import { InfrastructureException } from '../errors/automation.errors';

interface AutomationRecord {
  id: string;
  instagramAccountId: string;
  workspaceId: string | null;
  name: string;
  description: string | null;
  enabled: boolean;
  triggerType: TriggerType | null;
  triggerConfig: any;
  createdAt: Date;
  updatedAt: Date;
  conditions?: Array<{
    id: string;
    field: string;
    operator: Operator;
    value: string;
  }>;
  actions?: Array<{
    id: string;
    actionType: ActionType;
    payload: any;
  }>;
}

@Injectable()
export class AutomationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomainModel(record: AutomationRecord & { executions?: Array<{ status: string; startedAt: Date }> }): AutomationModel {
    const executions = record.executions || [];
    const runs = executions.length;
    let successRate = 'N/A';
    let lastActive: string | null = null;

    if (runs > 0) {
      const completedExecutions = executions.filter(
        (e) => e.status === 'SUCCESS' || e.status === 'FAILED',
      );
      if (completedExecutions.length > 0) {
        const successes = completedExecutions.filter(
          (e) => e.status === 'SUCCESS',
        ).length;
        successRate = `${Math.round((successes / completedExecutions.length) * 100)}%`;
      } else {
        successRate = '100%';
      }
      lastActive = executions[0].startedAt.toISOString();
    }

    return {
      id: record.id,
      instagramAccountId: record.instagramAccountId,
      workspaceId: record.workspaceId,
      name: record.name,
      description: record.description,
      enabled: record.enabled,
      triggerType: record.triggerType,
      triggerConfig: record.triggerConfig || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      conditions: (record.conditions || []).map((c) => ({
        id: c.id,
        field: c.field,
        operator: c.operator,
        value: c.value,
      })),
      actions: (record.actions || []).map((a) => ({
        id: a.id,
        actionType: a.actionType,
        payload: (a.payload as Record<string, any>) || {},
      })),
      metrics: {
        runs,
        successRate,
        lastActive,
      },
    };
  }

  async findMany(filters: {
    instagramAccountId?: string;
    workspaceId?: string;
    enabled?: boolean;
    triggerType?: TriggerType;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ total: number; items: AutomationModel[] }> {
    try {
      const {
        instagramAccountId,
        workspaceId,
        enabled,
        triggerType,
        search,
        page = 1,
        limit = 10,
      } = filters;
      const skip = (page - 1) * limit;

      const where: Prisma.AutomationWhereInput = {};

      if (instagramAccountId) {
        where.instagramAccountId = instagramAccountId;
      }
      if (workspaceId) {
        where.workspaceId = workspaceId;
      }

      // Keep backward compatibility defaults if none supplied
      if (!instagramAccountId && !workspaceId) {
        where.instagramAccountId = 'default';
      }

      if (enabled !== undefined) {
        where.enabled = enabled;
      }
      if (triggerType !== undefined) {
        where.triggerType = triggerType;
      }
      if (search) {
        where.name = { contains: search, mode: 'insensitive' };
      }

      const [total, items] = await Promise.all([
        this.prisma.automation.count({ where }),
        this.prisma.automation.findMany({
          where,
          include: {
            conditions: true,
            actions: true,
            executions: {
              select: {
                status: true,
                startedAt: true,
              },
              orderBy: { startedAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      return {
        total,
        items: items.map((item) => this.mapToDomainModel(item)),
      };
    } catch (error) {
      throw new InfrastructureException(
        `Failed to retrieve automations list: ${(error as Error).message}`,
      );
    }
  }

  async findUnique(id: string): Promise<AutomationModel | null> {
    try {
      const record = await this.prisma.automation.findUnique({
        where: { id },
        include: {
          conditions: true,
          actions: true,
          executions: {
            select: {
              status: true,
              startedAt: true,
            },
            orderBy: { startedAt: 'desc' },
          },
        },
      });
      return record ? this.mapToDomainModel(record) : null;
    } catch (error) {
      throw new InfrastructureException(
        `Failed to retrieve automation details: ${(error as Error).message}`,
      );
    }
  }

  async create(data: {
    instagramAccountId?: string;
    workspaceId?: string;
    name: string;
    description?: string;
    enabled?: boolean;
    triggerType?: TriggerType;
    triggerConfig?: any;
    triggers?: Array<{ eventType: any; enabled?: boolean }>;
    conditions: Array<{ field: string; operator: Operator; value: string }>;
    actions: Array<{ actionType: ActionType; payload: any }>;
  }): Promise<AutomationModel> {
    try {
      const accountId = data.instagramAccountId || 'default';
      const workspaceId = data.workspaceId || null;

      // Extract trigger Type and custom config
      let triggerType = data.triggerType;
      let triggerConfig = data.triggerConfig || {};

      // Fallback for legacy controllers/payloads that specify "triggers" array
      if (!triggerType && data.triggers && data.triggers.length > 0) {
        const primaryTrigger = data.triggers[0];
        const oldType = primaryTrigger.eventType as any;
        if (
          oldType === 'MESSAGE_RECEIVED' ||
          oldType === 'KEYWORD_MATCH' ||
          oldType === 'FIRST_MESSAGE'
        ) {
          triggerType = TriggerType.DIRECT_MESSAGE;
          triggerConfig = { mode: 'ANY_MESSAGE' };
        } else if (oldType === 'COMMENT_CREATED') {
          triggerType = TriggerType.REEL_COMMENT;
          triggerConfig = { mediaScope: 'ALL_REELS', matchType: 'ANY_COMMENT' };
        } else if (oldType === 'STORY_MENTION') {
          triggerType = TriggerType.STORY_MENTION;
          triggerConfig = {};
        } else {
          triggerType = oldType;
        }
      }

      // Default fallback
      if (!triggerType) {
        triggerType = TriggerType.DIRECT_MESSAGE;
        triggerConfig = { mode: 'ANY_MESSAGE' };
      }

      const created = await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          return tx.automation.create({
            data: {
              instagramAccountId: accountId,
              workspaceId,
              name: data.name,
              description: data.description,
              enabled: data.enabled ?? true,
              triggerType,
              triggerConfig: triggerConfig as Prisma.InputJsonValue,
              conditions: {
                create: data.conditions,
              },
              actions: {
                create: data.actions.map((act) => ({
                  actionType: act.actionType,
                  payload: normalizePayload(act.actionType, act.payload),
                })),
              },
            },
            include: {
              conditions: true,
              actions: true,
              executions: {
                select: {
                  status: true,
                  startedAt: true,
                },
                orderBy: { startedAt: 'desc' },
              },
            },
          });
        },
      );

      return this.mapToDomainModel(created);
    } catch (error) {
      throw new InfrastructureException(
        `Failed to persist new automation: ${(error as Error).message}`,
      );
    }
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      enabled?: boolean;
      triggerType?: TriggerType;
      triggerConfig?: any;
      triggers?: Array<{ eventType: any; enabled?: boolean }>;
      conditions?: Array<{ field: string; operator: Operator; value: string }>;
      actions?: Array<{ actionType: ActionType; payload: any }>;
      workspaceId?: string | null;
    },
  ): Promise<AutomationModel> {
    try {
      const updated = await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          // Replace items atomically if provided
          if (data.conditions) {
            await tx.automationCondition.deleteMany({
              where: { automationId: id },
            });
          }
          if (data.actions) {
            await tx.automationAction.deleteMany({
              where: { automationId: id },
            });
          }

          const actionsCreate = data.actions
            ? {
                create: data.actions.map((act) => ({
                  actionType: act.actionType,
                  payload: normalizePayload(act.actionType, act.payload),
                })),
              }
            : undefined;

          let triggerType = data.triggerType;
          let triggerConfig = data.triggerConfig;

          // Legacy mapping
          if (!triggerType && data.triggers && data.triggers.length > 0) {
            const primaryTrigger = data.triggers[0];
            const oldType = primaryTrigger.eventType as any;
            if (
              oldType === 'MESSAGE_RECEIVED' ||
              oldType === 'KEYWORD_MATCH' ||
              oldType === 'FIRST_MESSAGE'
            ) {
              triggerType = TriggerType.DIRECT_MESSAGE;
              triggerConfig = { mode: 'ANY_MESSAGE' };
            } else if (oldType === 'COMMENT_CREATED') {
              triggerType = TriggerType.REEL_COMMENT;
              triggerConfig = {
                mediaScope: 'ALL_REELS',
                matchType: 'ANY_COMMENT',
              };
            } else if (oldType === 'STORY_MENTION') {
              triggerType = TriggerType.STORY_MENTION;
              triggerConfig = {};
            } else {
              triggerType = oldType;
            }
          }

          const updateData: Prisma.AutomationUpdateInput = {
            name: data.name,
            description: data.description,
            enabled: data.enabled,
            conditions: data.conditions
              ? { create: data.conditions }
              : undefined,
            actions: actionsCreate,
          };

          if (triggerType !== undefined) {
            updateData.triggerType = triggerType;
          }
          if (triggerConfig !== undefined) {
            updateData.triggerConfig = triggerConfig as Prisma.InputJsonValue;
          }
          if (data.workspaceId !== undefined) {
            updateData.workspaceId = data.workspaceId;
          }

          return tx.automation.update({
            where: { id },
            data: updateData,
            include: {
              conditions: true,
              actions: true,
              executions: {
                select: {
                  status: true,
                  startedAt: true,
                },
                orderBy: { startedAt: 'desc' },
              },
            },
          });
        },
      );

      return this.mapToDomainModel(updated);
    } catch (error) {
      throw new InfrastructureException(
        `Failed to update automation values: ${(error as Error).message}`,
      );
    }
  }

  async delete(id: string): Promise<AutomationModel> {
    try {
      const deleted = await this.prisma.automation.delete({
        where: { id },
        include: {
          conditions: true,
          actions: true,
          executions: {
            select: {
              status: true,
              startedAt: true,
            },
            orderBy: { startedAt: 'desc' },
          },
        },
      });
      return this.mapToDomainModel(deleted);
    } catch (error) {
      throw new InfrastructureException(
        `Failed to remove automation: ${(error as Error).message}`,
      );
    }
  }

  async findMatchingAutomations(
    eventType: TriggerType,
    instagramAccountId: string,
  ): Promise<AutomationModel[]> {
    try {
      const records = await this.prisma.automation.findMany({
        where: {
          instagramAccountId,
          enabled: true,
          triggerType: eventType,
        },
        include: {
          conditions: true,
          actions: true,
          executions: {
            select: {
              status: true,
              startedAt: true,
            },
            orderBy: { startedAt: 'desc' },
          },
        },
      });

      return records.map((record) => this.mapToDomainModel(record));
    } catch (error) {
      throw new InfrastructureException(
        `Failed to lookup matching automations: ${(error as Error).message}`,
      );
    }
  }
}
