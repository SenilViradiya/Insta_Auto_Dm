import { TriggerType } from '@prisma/client';

export interface DomainEvent {
  eventId: string;
  instagramAccountId: string;
  platform: string;
  eventType: TriggerType;
  senderId: string;
  recipientId: string;
  content: {
    text?: string;
    mediaUrl?: string;
    commentId?: string;
    messageId?: string;
    [key: string]: any;
  };
  metadata?: Record<string, any> | null;
  timestamp: Date;
}
