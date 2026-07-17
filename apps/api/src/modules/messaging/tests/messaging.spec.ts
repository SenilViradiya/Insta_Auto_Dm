import { MetaGraphClient } from '../clients/meta-graph.client';
import { TokenService } from '../token/token.service';
import { MetaRateLimiterService } from '../rate-limit/rate-limiter.service';
import { MessagingMetricsService } from '../metrics/messaging-metrics.service';
import { MessagingService } from '../services/messaging.service';
import { mapMetaError, mapNetworkError } from '../mappers/error.mapper';
import { validateSendMessage } from '../validators/message.validator';
import {
  TokenExpiredException,
  RateLimitException,
  NetworkException,
  MessageValidationException,
  MetaApiException,
} from '../exceptions/messaging.exceptions';

// ---------- Error Mapper Tests ----------
describe('Error Mapper', () => {
  it('maps Meta code 190 to TokenExpiredException', () => {
    const result = mapMetaError(190, 'Token expired');
    expect(result.internalCode).toBe('TOKEN_EXPIRED');
    expect(result.retryable).toBe(false);
    expect(result.exception).toBeInstanceOf(TokenExpiredException);
  });

  it('maps Meta code 613 to RATE_LIMITED', () => {
    const result = mapMetaError(613, 'Rate limited');
    expect(result.internalCode).toBe('RATE_LIMITED');
    expect(result.retryable).toBe(true);
    expect(result.exception).toBeInstanceOf(RateLimitException);
  });

  it('maps Meta code 4 to TRANSIENT_FAILURE (retryable)', () => {
    const result = mapMetaError(4, 'Too many calls');
    expect(result.internalCode).toBe('TRANSIENT_FAILURE');
    expect(result.retryable).toBe(true);
  });

  it('maps Meta code 10 to PERMISSION_DENIED (non-retryable)', () => {
    const result = mapMetaError(10, 'Denied');
    expect(result.internalCode).toBe('PERMISSION_DENIED');
    expect(result.retryable).toBe(false);
  });

  it('maps unknown Meta code to UNKNOWN_META_ERROR', () => {
    const result = mapMetaError(9999, 'Something');
    expect(result.internalCode).toBe('UNKNOWN_META_ERROR');
    expect(result.retryable).toBe(false);
  });

  it('maps ECONNABORTED to NetworkException', () => {
    const err = mapNetworkError({ code: 'ECONNABORTED' });
    expect(err).toBeInstanceOf(NetworkException);
  });
});

// ---------- Validator Tests ----------
describe('Message Validator', () => {
  it('validates a correct payload', () => {
    const result = validateSendMessage({
      instagramAccountId: 'acc-1',
      recipientInstagramId: 'user-1',
      messageText: 'Hello!',
    });
    expect(result.instagramAccountId).toBe('acc-1');
    expect(result.messageType).toBe('TEXT');
  });

  it('rejects empty messageText', () => {
    expect(() =>
      validateSendMessage({
        instagramAccountId: 'acc-1',
        recipientInstagramId: 'user-1',
        messageText: '',
      }),
    ).toThrow(MessageValidationException);
  });

  it('rejects missing recipientInstagramId', () => {
    expect(() =>
      validateSendMessage({
        instagramAccountId: 'acc-1',
        recipientInstagramId: '',
        messageText: 'Hi',
      }),
    ).toThrow(MessageValidationException);
  });

  it('rejects messages exceeding max length', () => {
    const longText = 'x'.repeat(1001);
    expect(() =>
      validateSendMessage({
        instagramAccountId: 'acc-1',
        recipientInstagramId: 'user-1',
        messageText: longText,
      }),
    ).toThrow(MessageValidationException);
  });
});

// ---------- Metrics Tests ----------
describe('MessagingMetricsService', () => {
  let metrics: MessagingMetricsService;

  beforeEach(() => {
    metrics = new MessagingMetricsService();
  });

  it('counts sent messages and computes average', () => {
    metrics.incrementSent(100);
    metrics.incrementSent(200);
    metrics.incrementSent(300);
    const m = metrics.getMetrics();
    expect(m.messagesSent).toBe(3);
    expect(m.averageSendTimeMs).toBe(200);
  });

  it('tracks p95 and p99', () => {
    for (let i = 1; i <= 100; i++) {
      metrics.incrementSent(i * 10);
    }
    const m = metrics.getMetrics();
    expect(m.p95SendTimeMs).toBeGreaterThan(900);
    expect(m.p99SendTimeMs).toBeGreaterThan(980);
  });

  it('tracks failures and retries', () => {
    metrics.incrementFailed();
    metrics.incrementFailed();
    metrics.incrementRetry();
    metrics.incrementRateLimitHit();
    metrics.incrementTokenError();
    metrics.incrementNetworkError();
    const m = metrics.getMetrics();
    expect(m.messagesFailed).toBe(2);
    expect(m.retries).toBe(1);
    expect(m.rateLimitHits).toBe(1);
    expect(m.tokenErrors).toBe(1);
    expect(m.networkErrors).toBe(1);
  });
});

// ---------- Rate Limiter Tests ----------
describe('MetaRateLimiterService', () => {
  let rateLimiter: MetaRateLimiterService;
  let mockRedis: any;

  beforeEach(() => {
    const config = {
      rateLimit: 3,
      rateLimitWindowMs: 1000,
    } as any;
    rateLimiter = new MetaRateLimiterService(config);

    mockRedis = {
      zremrangebyscore: jest.fn().mockResolvedValue(0),
      zcard: jest.fn().mockResolvedValue(0),
      zadd: jest.fn().mockResolvedValue(1),
      pexpire: jest.fn().mockResolvedValue(1),
      zrange: jest.fn().mockResolvedValue([]),
      quit: jest.fn().mockResolvedValue(undefined),
    };
    (rateLimiter as any).redis = mockRedis;
  });

  it('allows requests under the limit', async () => {
    mockRedis.zcard.mockResolvedValue(1);
    await expect(rateLimiter.acquire('acc-1')).resolves.not.toThrow();
    expect(mockRedis.zadd).toHaveBeenCalled();
  });

  it('throws RateLimitException when at capacity', async () => {
    mockRedis.zcard.mockResolvedValue(3);
    await expect(rateLimiter.acquire('acc-1')).rejects.toThrow(
      RateLimitException,
    );
  });

  it('fail-open when Redis errors', async () => {
    mockRedis.zremrangebyscore.mockRejectedValue(new Error('Redis down'));
    await expect(rateLimiter.acquire('acc-1')).resolves.not.toThrow();
  });
});

// ---------- Token Service Tests ----------
describe('TokenService', () => {
  let tokenService: TokenService;
  let mockMetaTokenService: any;

  beforeEach(() => {
    mockMetaTokenService = {
      getToken: jest.fn(),
      invalidateCache: jest.fn(),
    };
    tokenService = new TokenService(mockMetaTokenService);
  });

  it('delegates getToken directly to MetaTokenService', async () => {
    mockMetaTokenService.getToken.mockResolvedValue('delegated-token');
    const token = await tokenService.getToken('acc-1');
    expect(token).toBe('delegated-token');
    expect(mockMetaTokenService.getToken).toHaveBeenCalledWith('acc-1');
  });

  it('delegates invalidateCache directly to MetaTokenService', async () => {
    await tokenService.invalidateCache('acc-1');
    expect(mockMetaTokenService.invalidateCache).toHaveBeenCalledWith('acc-1');
  });
});

// ---------- MetaGraphClient Tests ----------
describe('MetaGraphClient', () => {
  let client: MetaGraphClient;
  let mockMetaMessagingService: any;
  let mockGraphClient: any;

  beforeEach(() => {
    mockMetaMessagingService = {
      sendMessage: jest.fn(),
    };
    mockGraphClient = {
      request: jest.fn(),
    };
    client = new MetaGraphClient(mockMetaMessagingService, mockGraphClient);
  });

  it('delegates sendMessage to MetaMessagingService', async () => {
    mockMetaMessagingService.sendMessage.mockResolvedValue({
      recipientId: 'user-1',
      messageId: 'mid.123',
    });

    const result = await client.sendMessage('user-1', 'Hello', 'token');
    expect(result.recipientId).toBe('user-1');
    expect(result.messageId).toBe('mid.123');
    expect(mockMetaMessagingService.sendMessage).toHaveBeenCalledWith(
      'user-1',
      'Hello',
      'token',
    );
  });

  it('delegates healthCheck to GraphClient search request', async () => {
    mockGraphClient.request.mockResolvedValue({ id: 'some-id' });
    const healthy = await client.healthCheck('token');
    expect(healthy).toBe(true);
    expect(mockGraphClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        endpoint: 'https://graph.instagram.com/me',
        token: 'token',
      }),
    );
  });
});

// ---------- MessagingService Integration Tests ----------
describe('MessagingService', () => {
  let service: MessagingService;
  let mockTokenService: any;
  let mockRateLimiter: any;
  let mockGraphClient: any;
  let mockMessageRepo: any;
  let mockMetrics: any;

  beforeEach(() => {
    const config = {
      retryAttempts: 2,
      retryDelayMs: 10,
      debugLogging: false,
    } as any;

    mockTokenService = {
      getToken: jest.fn().mockResolvedValue('test-token'),
    };

    mockRateLimiter = {
      acquire: jest.fn().mockResolvedValue(undefined),
    };

    mockGraphClient = {
      sendMessage: jest.fn().mockResolvedValue({
        recipientId: 'user-1',
        messageId: 'mid.success',
      }),
    };

    mockMessageRepo = {
      create: jest.fn().mockResolvedValue({
        id: 'msg-1',
        instagramAccountId: 'acc-1',
        recipientInstagramId: 'user-1',
        messageText: 'Hello',
        status: 'QUEUED',
        createdAt: new Date(),
      }),
      updateStatus: jest.fn().mockResolvedValue({}),
      incrementRetry: jest.fn().mockResolvedValue({}),
    };

    mockMetrics = {
      incrementSent: jest.fn(),
      incrementFailed: jest.fn(),
      incrementRetry: jest.fn(),
      incrementRateLimitHit: jest.fn(),
      incrementTokenError: jest.fn(),
      incrementNetworkError: jest.fn(),
    };

    service = new MessagingService(
      config,
      mockTokenService,
      mockRateLimiter,
      mockGraphClient,
      mockMessageRepo,
      mockMetrics,
    );
  });

  it('sends message successfully through full pipeline', async () => {
    const result = await service.send({
      instagramAccountId: 'acc-1',
      recipientInstagramId: 'user-1',
      messageText: 'Hello!',
    });

    expect(result.success).toBe(true);
    expect(result.metaMessageId).toBe('mid.success');
    expect(mockTokenService.getToken).toHaveBeenCalledWith('acc-1');
    expect(mockRateLimiter.acquire).toHaveBeenCalledWith('acc-1');
    expect(mockGraphClient.sendMessage).toHaveBeenCalledWith(
      'user-1',
      'Hello!',
      'test-token',
    );
    expect(mockMetrics.incrementSent).toHaveBeenCalled();
  });

  it('retries on transient failure and then succeeds', async () => {
    mockGraphClient.sendMessage
      .mockRejectedValueOnce(new NetworkException('Timeout'))
      .mockResolvedValueOnce({
        recipientId: 'user-1',
        messageId: 'mid.retry-ok',
      });

    const result = await service.send({
      instagramAccountId: 'acc-1',
      recipientInstagramId: 'user-1',
      messageText: 'Retry me',
    });

    expect(result.success).toBe(true);
    expect(mockMetrics.incrementRetry).toHaveBeenCalled();
    expect(mockMessageRepo.incrementRetry).toHaveBeenCalled();
  });

  it('fails immediately on TokenExpiredException (non-retryable)', async () => {
    mockTokenService.getToken.mockRejectedValue(new TokenExpiredException());

    const result = await service.send({
      instagramAccountId: 'acc-1',
      recipientInstagramId: 'user-1',
      messageText: 'Will fail',
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('TokenExpiredException');
    expect(mockMetrics.incrementTokenError).toHaveBeenCalled();
    expect(mockGraphClient.sendMessage).not.toHaveBeenCalled();
  });

  it('fails on rate limit', async () => {
    mockRateLimiter.acquire.mockRejectedValue(
      new RateLimitException('Rate limited'),
    );

    const result = await service.send({
      instagramAccountId: 'acc-1',
      recipientInstagramId: 'user-1',
      messageText: 'Will throttle',
    });

    expect(result.success).toBe(false);
    expect(mockMetrics.incrementRateLimitHit).toHaveBeenCalled();
    expect(mockGraphClient.sendMessage).not.toHaveBeenCalled();
  });

  it('fails on validation error without calling any service', async () => {
    const result = await service.send({
      instagramAccountId: 'acc-1',
      recipientInstagramId: 'user-1',
      messageText: '',
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('MessageValidationException');
    expect(mockTokenService.getToken).not.toHaveBeenCalled();
  });

  it('exhausts retries and returns failure', async () => {
    mockGraphClient.sendMessage.mockRejectedValue(new NetworkException('Down'));

    const result = await service.send({
      instagramAccountId: 'acc-1',
      recipientInstagramId: 'user-1',
      messageText: 'Keep failing',
    });

    expect(result.success).toBe(false);
    expect(mockMetrics.incrementFailed).toHaveBeenCalled();
    expect(mockMetrics.incrementNetworkError).toHaveBeenCalled();
  });
});
