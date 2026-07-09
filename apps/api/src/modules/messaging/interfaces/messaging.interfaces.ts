export interface SendMessageRequest {
  instagramAccountId: string;
  recipientInstagramId: string;
  messageText: string;
  messageType?: string;
  automationExecutionId?: string;
  correlationId?: string;
}

export interface MessagingResult {
  success: boolean;
  messageId?: string;
  metaMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  durationMs: number;
}

export interface MetaGraphSendResponse {
  recipientId: string;
  messageId: string;
}

export interface MetaGraphErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export interface TokenInfo {
  accessToken: string;
  instagramAccountId: string;
  expiresAt: Date | null;
}
