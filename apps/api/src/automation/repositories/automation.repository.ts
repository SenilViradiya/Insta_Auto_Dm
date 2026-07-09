import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { TriggerType, Operator, ActionType } from '@prisma/client';
import { AutomationModel } from '../interfaces/repository.interfaces';
import { normalizePayload } from '../dto/action-payload.validator';
import { InfrastructureException } from '../errors/automation.errors';

@Injectable()
export class AutomationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomainModel(record: any): AutomationModel {
    return {
      id: record.id,
      instagramAccountId: record.instagramAccountId,
      name: record.name,
      description: record.description,
      enabled: record.enabled,
      triggerType: record.triggerType,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      triggers: (record.triggers || []).map((t: any) => ({
        id: t.id,
        eventType: t.eventType,
        enabled: t.enabled,
      })),
      conditions: (record.conditions || []).map((c: any) => ({
        id: c.id,
        field: c.field,
        operator: c.operator,
        value: c.value,
      })),
      actions: (record.actions || []).map((a: any) => ({
        id: a.id,
        actionType: a.actionType,
        payload: a.payload || {},
      })),
    };
  }

  async findMany(filters: {
    instagramAccountId?: string;
    workspaceId?: string;
    enabled?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ total: number; items: AutomationModel[] }> {
    try {
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

      return {
        total,
        items: items.map((item) => this.mapToDomainModel(item)),
      };
    } catch (error: any) {
      throw new InfrastructureException(
        `Failed to retrieve automations list: ${error.message}`,
      );
    }
  }

  async findUnique(id: string): Promise<AutomationModel | null> {
    try {
      const record = await this.prisma.automation.findUnique({
        where: { id },
        include: {
          triggers: true,
          conditions: true,
          actions: true,
        },
      });
      return record ? this.mapToDomainModel(record) : null;
    } catch (error: any) {
      throw new InfrastructureException(
        `Failed to retrieve automation details: ${error.message}`,
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
    triggers: Array<{ eventType: TriggerType; enabled?: boolean }>;
    conditions: Array<{ field: string; operator: Operator; value: string }>;
    actions: Array<{ actionType: ActionType; payload: any }>;
  }): Promise<AutomationModel> {
    try {
      const accountId =
        data.instagramAccountId || data.workspaceId || 'default';

      const created = await this.prisma.$transaction(async (tx: any) => {
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
                payload: normalizePayload(act.actionType, act.payload),
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

      return this.mapToDomainModel(created);
    } catch (error: any) {
      throw new InfrastructureException(
        `Failed to persist new automation: ${error.message}`,
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
      triggers?: Array<{ eventType: TriggerType; enabled?: boolean }>;
      conditions?: Array<{ field: string; operator: Operator; value: string }>;
      actions?: Array<{ actionType: ActionType; payload: any }>;
    },
  ): Promise<AutomationModel> {
    try {
      const updated = await this.prisma.$transaction(async (tx: any) => {
        // Replace items atomically if provided
        if (data.triggers) {
          await tx.automationTrigger.deleteMany({
            where: { automationId: id },
          });
        }
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

        return tx.automation.update({
          where: { id },
          data: {
            name: data.name,
            description: data.description,
            enabled: data.enabled,
            triggerType: data.triggerType,
            triggers: data.triggers ? { create: data.triggers } : undefined,
            conditions: data.conditions
              ? { create: data.conditions }
              : undefined,
            actions: actionsCreate,
          },
          include: {
            triggers: true,
            conditions: true,
            actions: true,
          },
        });
      });

      return this.mapToDomainModel(updated);
    } catch (error: any) {
      throw new InfrastructureException(
        `Failed to update automation values: ${error.message}`,
      );
    }
  }

  async delete(id: string): Promise<AutomationModel> {
    try {
      const deleted = await this.prisma.automation.delete({
        where: { id },
        include: {
          triggers: true,
          conditions: true,
          actions: true,
        },
      });
      return this.mapToDomainModel(deleted);
    } catch (error: any) {
      throw new InfrastructureException(
        `Failed to remove automation: ${error.message}`,
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

      return records.map((record) => this.mapToDomainModel(record));
    } catch (error: any) {
      throw new InfrastructureException(
        `Failed to lookup matching automations: ${error.message}`,
      );
    }
  }
}
