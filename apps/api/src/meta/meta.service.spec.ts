import { Test, TestingModule } from '@nestjs/testing';
import { MetaService } from './meta.service';
import { PrismaService } from '../prisma.service';
import { BadRequestException } from '@nestjs/common';
import {
  encryptToken,
  decryptToken,
} from '../modules/meta-platform/utils/crypto.utils';
import { GraphClient } from '../modules/meta-platform/clients/graph.client';

describe('MetaService', () => {
  let service: MetaService;
  let prismaMock: any;
  let graphClientMock: any;

  beforeEach(async () => {
    prismaMock = {
      instagramAccount: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ id: 'acc-uuid' }),
        findMany: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue({}),
      },
      instagramProfile: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    graphClientMock = {
      request: jest.fn(),
      paginate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetaService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: GraphClient, useValue: graphClientMock },
      ],
    }).compile();

    service = module.get<MetaService>(MetaService);

    process.env.META_APP_ID = 'test-app-id';
    process.env.META_APP_SECRET = 'test-app-secret';
    process.env.META_REDIRECT_URI = 'http://test-redirect.com';
    process.env.TOKEN_ENCRYPTION_KEY = '12345678901234567890123456789012';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLoginUrl', () => {
    it('should generate a valid Meta Direct Instagram OAuth URL with appropriate scopes', () => {
      const url = service.getLoginUrl();
      expect(url).toContain('https://www.facebook.com/v20.0/dialog/oauth');
      expect(url).toContain('client_id=test-app-id');
      expect(url).toContain('scope=instagram_basic%2Cinstagram_manage_messages%2Cinstagram_manage_comments');
    });
  });

  describe('fetchShortLivedToken', () => {
    it('should exchange code for short token', async () => {
      graphClientMock.request.mockResolvedValue({ access_token: 'short-token' });
      const res = await service.fetchShortLivedToken('code');
      expect(res.access_token).toBe('short-token');
      expect(graphClientMock.request).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'oauth/access_token',
        }),
      );
    });
  });

  describe('fetchLongLivedToken', () => {
    it('should exchange short token for long lived token', async () => {
      graphClientMock.request.mockResolvedValue({ access_token: 'long-token', expires_in: 3600 });
      const res = await service.fetchLongLivedToken('short-token');
      expect(res.access_token).toBe('long-token');
      expect(graphClientMock.request).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'oauth/access_token',
          params: expect.objectContaining({
            grant_type: 'fb_exchange_token',
          }),
        }),
      );
    });
  });

  describe('fetchInstagramProfile', () => {
    it('should request profile for active me node', async () => {
      graphClientMock.request.mockResolvedValue({ id: 'ig-1', username: 'ig_user' });
      const res = await service.fetchInstagramProfile('token');
      expect(res.id).toBe('ig-1');
      expect(res.username).toBe('ig_user');
      expect(graphClientMock.request).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'me',
          token: 'token',
        }),
      );
    });
  });

  describe('exchangeCodeAndConnect', () => {
    it('should exchange and register direct Instagram profile', async () => {
      graphClientMock.request
        .mockResolvedValueOnce({ access_token: 'short-token' })
        .mockResolvedValueOnce({ access_token: 'long-token', expires_in: 3600 })
        .mockResolvedValueOnce({ id: 'ig-1', username: 'ig_user', name: 'John Doe', profile_picture_url: 'pic' });

      await service.exchangeCodeAndConnect('my-code');

      expect(prismaMock.instagramAccount.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { instagramUserId: 'ig-1' },
          create: expect.objectContaining({
            pageId: 'instagram_login',
            pageName: 'ig_user',
          }),
        }),
      );

      expect(prismaMock.instagramProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { instagramAccountId: 'acc-uuid' },
          create: expect.objectContaining({
            username: 'ig_user',
            name: 'John Doe',
            profilePictureUrl: 'pic',
          }),
        }),
      );
    });
  });

  describe('status', () => {
    it('should list all connected profiles', async () => {
      const mockResult = [
        {
          id: '1',
          instagramUserId: 'ig-123',
          pageId: 'pg-123',
          pageName: 'My page',
          connectedAt: new Date(),
          tokenExpiresAt: null,
        },
      ];
      prismaMock.instagramAccount.findMany.mockResolvedValue(mockResult);

      const status = await service.getStatus();
      expect(status).toEqual(mockResult);
      expect(prismaMock.instagramAccount.findMany).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should delete the record from database', async () => {
      await service.disconnect('acc-uuid');
      expect(prismaMock.instagramAccount.delete).toHaveBeenCalledWith({
        where: { id: 'acc-uuid' },
      });
    });

    it('should throw BadRequestException if deletion fails', async () => {
      prismaMock.instagramAccount.delete.mockRejectedValue(
        new Error('DB Delete Error'),
      );
      await expect(service.disconnect('acc-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('crypto.utils', () => {
    it('should correctly encrypt and decrypt tokens', () => {
      const token = 'my-super-secret-meta-access-token';
      const key = '12345678901234567890123456789012';

      const encrypted = encryptToken(token, key);
      expect(encrypted).toContain(':');

      const decrypted = decryptToken(encrypted, key);
      expect(decrypted).toBe(token);
    });
  });
});
