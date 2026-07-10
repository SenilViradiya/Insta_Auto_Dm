import { Injectable, Logger } from '@nestjs/common';
import { MessagingConfig } from '../config/messaging.config';
import {
  MetaGraphSendResponse,
  MetaGraphErrorResponse,
} from '../interfaces/messaging.interfaces';
import { mapMetaError, mapNetworkError } from '../mappers/error.mapper';
import {
  MetaApiException,
  NetworkException,
  MessagingException,
} from '../exceptions/messaging.exceptions';

@Injectable()
export class MetaGraphClient {
  private readonly logger = new Logger(MetaGraphClient.name);

  constructor(private readonly config: MessagingConfig) {}

  async sendMessage(
    recipientId: string,
    messageText: string,
    accessToken: string,
  ): Promise<MetaGraphSendResponse> {
    const url = `${this.config.graphApiBaseUrl}/me/messages`;
    const body = {
      recipient: { id: recipientId },
      message: { text: messageText },
      messaging_type: 'RESPONSE',
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.httpTimeoutMs,
    );

    try {
      this.logger.debug(
        `Sending message to ${recipientId} via ${this.config.graphApiVersion}`,
      );

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseBody = await response.json();

      if (!response.ok) {
        return this.handleErrorResponse(responseBody as MetaGraphErrorResponse);
      }

      const payload = responseBody as {
        recipient_id?: string;
        message_id?: string;
      };

      return {
        recipientId: payload.recipient_id || recipientId,
        messageId: payload.message_id || '',
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof MessagingException) {
        throw error;
      }

      if ((error as Error).name === 'AbortError') {
        throw new NetworkException(
          `Meta API request timed out after ${this.config.httpTimeoutMs}ms`,
        );
      }

      throw mapNetworkError(error);
    }
  }

  private handleErrorResponse(errorResponse: MetaGraphErrorResponse): never {
    const metaError = errorResponse?.error;
    if (!metaError) {
      throw new MetaApiException('Unknown Meta API error response', 0);
    }

    const mapped = mapMetaError(
      metaError.code,
      metaError.message,
      metaError.error_subcode,
    );

    throw mapped.exception;
  }

  /**
   * Lightweight connectivity check — does NOT send a message.
   */
  async healthCheck(accessToken: string): Promise<boolean> {
    try {
      const url = `${this.config.graphApiBaseUrl}/me?fields=id`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
