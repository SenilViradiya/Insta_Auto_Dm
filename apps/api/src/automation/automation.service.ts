import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MatchType } from '@prisma/client';

export interface CreateAutomationDto {
  name: string;
  enabled?: boolean;
  keywords: Array<{ keyword: string; matchType: MatchType }>;
  actions: Array<{ message: string; delaySeconds?: number }>;
}

export interface UpdateAutomationDto {
  name?: string;
  enabled?: boolean;
  keywords?: Array<{ keyword: string; matchType: MatchType }>;
  actions?: Array<{ message: string; delaySeconds?: number }>;
}

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAutomationDto) {
    this.logger.log(`Creating automation: ${data.name}`);
    return this.prisma.automation.create({
      data: {
        name: data.name,
        enabled: data.enabled ?? true,
        keywords: {
          create: data.keywords.map((kw) => ({
            keyword: kw.keyword,
            matchType: kw.matchType,
          })),
        },
        actions: {
          create: data.actions.map((act) => ({
            message: act.message,
            delaySeconds: act.delaySeconds ?? 0,
          })),
        },
      },
      include: {
        keywords: true,
        actions: true,
      },
    });
  }

  async findAll() {
    this.logger.log('Retrieving all automations');
    return this.prisma.automation.findMany({
      include: {
        keywords: true,
        actions: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    this.logger.log(`Retrieving automation by ID: ${id}`);
    const automation = await this.prisma.automation.findUnique({
      where: { id },
      include: {
        keywords: true,
        actions: true,
      },
    });

    if (!automation) {
      throw new NotFoundException(`Automation with ID ${id} not found`);
    }

    return automation;
  }

  async update(id: string, data: UpdateAutomationDto) {
    this.logger.log(`Updating automation ID: ${id}`);
    // Check if exists first
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // Update keywords if provided
      if (data.keywords) {
        await tx.automationKeyword.deleteMany({
          where: { automationId: id },
        });
      }

      // Update actions if provided
      if (data.actions) {
        await tx.automationAction.deleteMany({
          where: { automationId: id },
        });
      }

      return tx.automation.update({
        where: { id },
        data: {
          name: data.name,
          enabled: data.enabled,
          keywords: data.keywords
            ? {
                create: data.keywords.map((kw) => ({
                  keyword: kw.keyword,
                  matchType: kw.matchType,
                })),
              }
            : undefined,
          actions: data.actions
            ? {
                create: data.actions.map((act) => ({
                  message: act.message,
                  delaySeconds: act.delaySeconds ?? 0,
                })),
              }
            : undefined,
        },
        include: {
          keywords: true,
          actions: true,
        },
      });
    });
  }

  async remove(id: string) {
    this.logger.log(`Deleting automation ID: ${id}`);
    // Check if exists
    await this.findOne(id);

    await this.prisma.automation.delete({
      where: { id },
    });

    return { deleted: true };
  }
}
