import { Injectable } from '@nestjs/common';

@Injectable()
export class MessagingConfig {
  get graphApiVersion(): string {
    return process.env.META_GRAPH_API_VERSION ?? 'v20.0';
  }

  get graphApiBaseUrl(): string {
    return `https://graph.facebook.com/${this.graphApiVersion}`;
  }

  get retryAttempts(): number {
    return parseInt(process.env.MESSAGING_RETRY_ATTEMPTS ?? '3', 10);
  }

  get retryDelayMs(): number {
    return parseInt(process.env.MESSAGING_RETRY_DELAY_MS ?? '2000', 10);
  }

  get httpTimeoutMs(): number {
    return parseInt(process.env.MESSAGING_HTTP_TIMEOUT_MS ?? '10000', 10);
  }

  get maxMessageLength(): number {
    return parseInt(process.env.MESSAGING_MAX_LENGTH ?? '1000', 10);
  }

  get rateLimit(): number {
    return parseInt(process.env.MESSAGING_RATE_LIMIT ?? '10', 10);
  }

  get rateLimitWindowMs(): number {
    return parseInt(process.env.MESSAGING_RATE_WINDOW_MS ?? '1000', 10);
  }

  get tokenCacheTtlSeconds(): number {
    return parseInt(process.env.MESSAGING_TOKEN_CACHE_TTL ?? '300', 10);
  }

  get encryptionKey(): string {
    const key = process.env.TOKEN_ENCRYPTION_KEY;
    if (!key) throw new Error('TOKEN_ENCRYPTION_KEY is not configured');
    return key;
  }

  get debugLogging(): boolean {
    return process.env.DEBUG_LOGGING === 'true';
  }
}
