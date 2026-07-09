export interface OutboundMessageEntity {
  id: string;
  instagramAccountId: string;
  automationExecutionId: string | null;
  recipientInstagramId: string;
  messageType: string;
  messageText: string;
  metaMessageId: string | null;
  status: string;
  errorCode: string | null;
  errorMessage: string | null;
  retryCount: number;
  correlationId: string | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
