import { Injectable } from '@nestjs/common';
import { MessagingService as MetaMessagingService } from '../../meta-platform/services/messaging.service';
import { GraphClient } from '../../meta-platform/clients/graph.client';
import { MetaGraphSendResponse } from '../interfaces/messaging.interfaces';

@Injectable()
export class MetaGraphClient {
  constructor(
    private readonly metaMessagingService: MetaMessagingService,
    private readonly graphClient: GraphClient,
  ) { }

  async sendMessage(
    recipientId: string,
    messageText: string,
    accessToken: string,
  ): Promise<MetaGraphSendResponse> {
    const response = await this.metaMessagingService.sendMessage(
      recipientId,
      messageText,
      accessToken,
    );
    return {
      recipientId: response.recipientId,
      messageId: response.messageId,
    };
  }

  async sendPublicReply(
    commentId: string,
    messageText: string,
    accessToken: string,
  ): Promise<{ commentId: string; replyId: string }> {
    return await this.metaMessagingService.sendPublicReply(
      commentId,
      messageText,
      accessToken,
    );
  }

  async healthCheck(accessToken: string): Promise<boolean> {
    try {
      const response = await this.graphClient.request({
        method: 'GET',
        endpoint: 'https://graph.instagram.com/me',
        token: accessToken,
        params: { fields: 'id' },
      });
      return !!response?.id;
    } catch {
      return false;
    }
  }
}
