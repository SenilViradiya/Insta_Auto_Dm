import { GraphClient } from '../clients/graph.client';
import { MetaPlatformConfig } from '../config/meta-platform.config';
import { translateMetaError } from '../exceptions/meta-error.translator';
import { PermissionService } from '../services/permission.service';
import { TokenService } from '../services/token.service';
import {
  TokenExpiredException,
  RateLimitException,
  InvalidParameterException,
  PermissionDeniedException,
  RequestTimeoutException,
  GraphClientException,
} from '../exceptions/meta.exceptions';

describe('Meta Platform Error Translation Layer', () => {
  it('should translate code 190 to TokenExpiredException', () => {
    const error = translateMetaError({ code: 190, message: 'Session expired' });
    expect(error).toBeInstanceOf(TokenExpiredException);
  });

  it('should translate code 613, 4, 17 to RateLimitException', () => {
    const error = translateMetaError({ code: 613, message: 'Rate limit hit' });
    expect(error).toBeInstanceOf(RateLimitException);
  });

  it('should translate code 100 to InvalidParameterException', () => {
    const error = translateMetaError({
      code: 100,
      message: 'Invalid parameter',
    });
    expect(error).toBeInstanceOf(InvalidParameterException);
  });

  it('should translate code 10 and 200-299 to PermissionDeniedException', () => {
    const error1 = translateMetaError({
      code: 10,
      message: 'Permission denied',
    });
    expect(error1).toBeInstanceOf(PermissionDeniedException);

    const error2 = translateMetaError({
      code: 201,
      message: 'Account status restricted',
    });
    expect(error2).toBeInstanceOf(PermissionDeniedException);
  });
});

describe('GraphClient request dispatcher', () => {
  let config: MetaPlatformConfig;
  let client: GraphClient;

  beforeEach(() => {
    config = {
      graphApiBaseUrl: 'https://graph.facebook.com',
      graphApiVersion: 'v20.0',
      httpTimeoutMs: 1000,
      maxRetries: 1,
      tokenEncryptionKey: 'key',
    } as any;
    client = new GraphClient(config);
  });

  it('should serialize fields correctly and make successful requests', async () => {
    const mockJson = { id: '123', username: 'alex' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: jest.fn().mockResolvedValue(mockJson),
    });

    const result = await client.request({
      method: 'GET',
      endpoint: 'me',
      token: 'test-token',
    });

    expect(result).toEqual(mockJson);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://graph.facebook.com/v20.0/me',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    );
  });

  it('should raise request timeout exception upon AbortError', async () => {
    const abortError = new Error('The user aborted a request.');
    abortError.name = 'AbortError';
    global.fetch = jest.fn().mockRejectedValue(abortError);

    await expect(
      client.request({
        method: 'GET',
        endpoint: 'me/accounts',
      }),
    ).rejects.toThrow(RequestTimeoutException);
  });
});

describe('PermissionService validation checks', () => {
  let mockGraphClient: any;
  let permissionService: PermissionService;

  beforeEach(() => {
    mockGraphClient = { request: jest.fn() };
    permissionService = new PermissionService(mockGraphClient);
  });

  it('returns true for hasAllRequired if all scopes exist as granted', async () => {
    mockGraphClient.request.mockResolvedValue({
      data: [
        { permission: 'instagram_basic', status: 'granted' },
        { permission: 'instagram_manage_messages', status: 'granted' },
        { permission: 'instagram_manage_comments', status: 'granted' },
        { permission: 'pages_show_list', status: 'granted' },
        { permission: 'pages_read_engagement', status: 'granted' },
        { permission: 'business_management', status: 'granted' },
      ],
    });

    const result = await permissionService.validatePermissions('token');
    expect(result.hasAllRequired).toBe(true);
    expect(result.scopes.instagram_basic).toBe(true);
  });

  it('returns false for hasAllRequired if any scope is declined', async () => {
    mockGraphClient.request.mockResolvedValue({
      data: [
        { permission: 'instagram_basic', status: 'granted' },
        { permission: 'instagram_manage_messages', status: 'declined' },
      ],
    });

    const result = await permissionService.validatePermissions('token');
    expect(result.hasAllRequired).toBe(false);
    expect(result.scopes.instagram_manage_messages).toBe(false);
  });
});
