import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { OutboundMessageEntity } from '../entities/outbound-message.entity';
import { OutboundMessageStatus, OutboundMessage } from '@prisma/client';

@Injectable()
export class MessageRepository {
  private readonly logger = new Logger(MessageRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(record: OutboundMessage): OutboundMessageEntity {
    return {
      id: record.id,
      instagramAccountId: record.instagramAccountId,
      automationExecutionId: record.automationExecutionId,
      recipientInstagramId: record.recipientInstagramId,
      messageType: record.messageType,
      messageText: record.messageText,
      metaMessageId: record.metaMessageId,
      status: record.status,
      errorCode: record.errorCode,
      errorMessage: record.errorMessage,
      retryCount: record.retryCount,
      correlationId: record.correlationId,
      sentAt: record.sentAt,
      deliveredAt: record.deliveredAt,
      failedAt: record.failedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async create(data: {
    instagramAccountId: string;
    recipientInstagramId: string;
    messageText: string;
    messageType?: string;
    automationExecutionId?: string;
    correlationId?: string;
  }): Promise<OutboundMessageEntity> {
    const record = await this.prisma.outboundMessage.create({
      data: {
        instagramAccountId: data.instagramAccountId,
        recipientInstagramId: data.recipientInstagramId,
        messageText: data.messageText,
        messageType: data.messageType ?? 'TEXT',
        automationExecutionId: data.automationExecutionId ?? null,
        correlationId: data.correlationId ?? null,
        status: OutboundMessageStatus.QUEUED,
      },
    });
    return this.mapToEntity(record);
  }

  async updateStatus(
    id: string,
    status: OutboundMessageStatus,
    extra?: {
      metaMessageId?: string;
      errorCode?: string;
      errorMessage?: string;
      sentAt?: Date;
      deliveredAt?: Date;
      failedAt?: Date;
    },
  ): Promise<OutboundMessageEntity> {
    const record = await this.prisma.outboundMessage.update({
      where: { id },
      data: {
        status,
        ...(extra || {}),
      },
    });
    return this.mapToEntity(record);
  }

  async incrementRetry(id: string): Promise<OutboundMessageEntity> {
    const record = await this.prisma.outboundMessage.update({
      where: { id },
      data: {
        retryCount: { increment: 1 },
        status: OutboundMessageStatus.RETRYING,
      },
    });
    return this.mapToEntity(record);
  }

  async findPending(limit = 50): Promise<OutboundMessageEntity[]> {
    const records = await this.prisma.outboundMessage.findMany({
      where: {
        status: {
          in: [OutboundMessageStatus.QUEUED, OutboundMessageStatus.RETRYING],
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return records.map((r) => this.mapToEntity(r));
  }

  async findFailed(limit = 50): Promise<OutboundMessageEntity[]> {
    const records = await this.prisma.outboundMessage.findMany({
      where: { status: OutboundMessageStatus.FAILED },
      orderBy: { failedAt: 'desc' },
      take: limit,
    });
    return records.map((r) => this.mapToEntity(r));
  }

  async findByAccount(
    instagramAccountId: string,
    page = 1,
    limit = 20,
  ): Promise<{ total: number; items: OutboundMessageEntity[] }> {
    const skip = (page - 1) * limit;
    const [total, records] = await Promise.all([
      this.prisma.outboundMessage.count({ where: { instagramAccountId } }),
      this.prisma.outboundMessage.findMany({
        where: { instagramAccountId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);
    return { total, items: records.map((r) => this.mapToEntity(r)) };
  }

  async findById(id: string): Promise<OutboundMessageEntity | null> {
    const record = await this.prisma.outboundMessage.findUnique({
      where: { id },
    });
    return record ? this.mapToEntity(record) : null;
  }
}
