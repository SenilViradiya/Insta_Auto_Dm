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
        upsert: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue({}),
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
    it('should generate a valid Meta OAuth URL with appropriate scopes', () => {
      const url = service.getLoginUrl();
      expect(url).toContain('https://www.facebook.com/v20.0/dialog/oauth');
      expect(url).toContain('client_id=test-app-id');
      expect(url).toContain('scope=instagram_basic');
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
