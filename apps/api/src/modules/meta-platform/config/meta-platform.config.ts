import { Injectable } from '@nestjs/common';

@Injectable()
export class MetaPlatformConfig {
  get appId(): string {
    return process.env.META_APP_ID || '';
  }

  get appSecret(): string {
    return process.env.META_APP_SECRET || '';
  }

  get instagramAppId(): string {
    return process.env.INSTAGRAM_APP_ID || '';
  }

  get instagramAppSecret(): string {
    return process.env.INSTAGRAM_APP_SECRET || '';
  }

  get redirectUri(): string {
    return process.env.META_REDIRECT_URI || '';
  }

  get graphApiVersion(): string {
    return process.env.META_GRAPH_API_VERSION || 'v20.0';
  }

  get graphApiBaseUrl(): string {
    return process.env.META_GRAPH_API_BASE_URL || 'https://graph.facebook.com';
  }

  get httpTimeoutMs(): number {
    return parseInt(process.env.META_HTTP_TIMEOUT_MS || '10000', 10);
  }

  get maxRetries(): number {
    return parseInt(process.env.META_MAX_RETRIES || '3', 10);
  }

  get tokenEncryptionKey(): string {
    return (
      process.env.TOKEN_ENCRYPTION_KEY || 'default-secret-key-that-is-32-chars'
    );
  }

  get webhookVerifyToken(): string {
    return process.env.META_VERIFY_TOKEN || '';
  }
}
