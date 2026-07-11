import { Injectable, Logger } from '@nestjs/common';
import { GraphClient } from '../clients/graph.client';

export interface SendMessageResponse {
  recipientId: string;
  messageId: string;
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(private readonly graphClient: GraphClient) {}

  async sendMessage(
    recipientId: string,
    messageText: string,
    accessToken: string
  ): Promise<SendMessageResponse> {
    const response = await this.graphClient.request<{
      recipient_id?: string;
      message_id?: string;
    }>({
      method: 'POST',
      endpoint: 'me/messages',
      body: {
        recipient: { id: recipientId },
        message: { text: messageText },
        messaging_type: 'RESPONSE',
      },
      token: accessToken,
    });

    return {
      recipientId: response.recipient_id || recipientId,
      messageId: response.message_id || '',
    };
  }

  async sendPublicReply(
    commentId: string,
    messageText: string,
    accessToken: string
  ): Promise<{ commentId: string; replyId: string }> {
    const response = await this.graphClient.request<{
      id?: string;
    }>({
      method: 'POST',
      endpoint: `${commentId}/replies`,
      body: {
        message: messageText,
      },
      token: accessToken,
    });

    return {
      commentId,
      replyId: response.id || '',
    };
  }
}
