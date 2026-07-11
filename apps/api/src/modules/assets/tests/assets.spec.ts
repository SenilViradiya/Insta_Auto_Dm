import { Test, TestingModule } from '@nestjs/testing';
import { AssetService } from '../services/asset.service';
import { AssetRepository } from '../repositories/asset.repository';
import { MetaAssetClient } from '../clients/meta-asset.client';
import { PrismaService } from '../../../prisma.service';
import { AssetSyncException, ProfileSyncException } from '../exceptions/assets.exceptions';
import { InstagramAssetType } from '@prisma/client';
import { encryptToken } from '../../../meta/crypto.utils';

describe('Asset Management Module', () => {
  let service: AssetService;
  let repository: AssetRepository;
  let metaClient: MetaAssetClient;
  let prisma: PrismaService;

  const mockPrismaService = {
    instagramAccount: {
      findUnique: jest.fn(),
    },
    instagramProfile: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    instagramAsset: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
  };

  const mockMetaClient = {
    fetchProfile: jest.fn(),
    fetchMediaList: jest.fn(),
  };

  const mockAssetRepository = {
    upsertProfile: jest.fn(),
    getProfileByAccountId: jest.fn(),
    findUniqueAsset: jest.fn(),
    bulkUpsertAssets: jest.fn(),
    bulkArchiveMissing: jest.fn(),
    findAssets: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AssetRepository, useValue: mockAssetRepository },
        { provide: MetaAssetClient, useValue: mockMetaClient },
      ],
    }).compile();

    service = module.get<AssetService>(AssetService);
    repository = module.get<AssetRepository>(AssetRepository);
    metaClient = module.get<MetaAssetClient>(MetaAssetClient);
    prisma = module.get<PrismaService>(PrismaService);

    process.env.TOKEN_ENCRYPTION_KEY = 'secret-key-123456789012345678901234';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('MetaAssetClient (fetch utilities)', () => {
    it('normalizes type post, reel, image, video and carousel correctly', async () => {
      const mockProfileService = {} as any;
      const mockAssetService = {
        fetchMediaList: jest.fn().mockResolvedValue({
          items: [
            {
              instagramMediaId: 'media-post',
              caption: 'My Post',
              mediaType: 'IMAGE',
              permalink: 'https://instagram.com/p/123/',
              timestamp: new Date(),
            },
            {
              instagramMediaId: 'media-reel',
              caption: 'My Reel',
              mediaType: 'VIDEO',
              permalink: 'https://instagram.com/reel/456/',
              timestamp: new Date(),
            },
          ],
        }),
      } as any;
      const client = new MetaAssetClient(mockProfileService, mockAssetService);
      const result = await client.fetchMediaList('usr-1', 'tok', 100);
      expect(result.items.length).toBe(2);
      expect(result.items[0].instagramMediaId).toBe('media-post');
      expect(result.items[1].instagramMediaId).toBe('media-reel');
    });
  });

  describe('AssetRepository', () => {
    it('findAssets delegates count and findMany queries with correct filter parameters', async () => {
      const repo = new AssetRepository(prisma as any);
      mockPrismaService.instagramAsset.count.mockResolvedValue(1);
      mockPrismaService.instagramAsset.findMany.mockResolvedValue([
        { id: '1', instagramAccountId: 'acc-1', caption: 'Promo post' },
      ]);

      const filters = {
        instagramAccountId: 'acc-1',
        assetType: InstagramAssetType.POST,
        page: 1,
        limit: 10,
      };

      const result = await repo.findAssets(filters);
      expect(result.total).toBe(1);
      expect(result.items[0].caption).toBe('Promo post');
      expect(mockPrismaService.instagramAsset.count).toHaveBeenCalled();
      expect(mockPrismaService.instagramAsset.findMany).toHaveBeenCalledWith({
        where: {
          isArchived: false,
          instagramAccountId: 'acc-1',
          assetType: InstagramAssetType.POST,
        },
        orderBy: { timestamp: 'desc' },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('AssetService Synchronization flow', () => {
    it('should throw AssetSyncException if Instagram Account does not exist', async () => {
      mockPrismaService.instagramAccount.findUnique.mockResolvedValue(null);

      await expect(service.syncProfileAndAssets('unknown-acc')).rejects.toThrow(
        AssetSyncException
      );
    });

    it('should sync profile and media assets successfully', async () => {
      const encrypted = encryptToken('raw-token', process.env.TOKEN_ENCRYPTION_KEY!);

      const mockAccount = {
        id: 'acc-1',
        instagramUserId: 'insta-usr-id',
        accessTokenEncrypted: encrypted,
      };
      mockPrismaService.instagramAccount.findUnique.mockResolvedValue(mockAccount);

      const mockProfile = { id: 'prof-1', username: 'john_doe' };
      mockMetaClient.fetchProfile.mockResolvedValue({
        id: 'insta-usr-id',
        username: 'john_doe',
        name: 'John Doe',
        followers: 100,
        following: 50,
        mediaCount: 1,
      });
      mockAssetRepository.upsertProfile.mockResolvedValue(mockProfile);

      mockMetaClient.fetchMediaList.mockResolvedValue({
        items: [
          {
            instagramMediaId: 'media-1',
            caption: 'Awesome day',
            mediaType: 'VIDEO',
            permalink: 'https://instagram.com/reel/111/',
            timestamp: new Date(),
          },
        ],
        nextCursor: undefined,
      });

      mockAssetRepository.bulkArchiveMissing.mockResolvedValue(0);

      const result = await service.syncProfileAndAssets('acc-1');

      expect(result.profile).toEqual(mockProfile);
      expect(result.syncedAssetsCount).toBe(1);
      expect(mockMetaClient.fetchProfile).toHaveBeenCalledWith('insta-usr-id', 'raw-token');
      expect(mockAssetRepository.bulkUpsertAssets).toHaveBeenCalledWith(
        'acc-1',
        expect.arrayContaining([
          expect.objectContaining({
            instagramMediaId: 'media-1',
            assetType: InstagramAssetType.REEL,
          }),
        ])
      );
      expect(mockAssetRepository.bulkArchiveMissing).toHaveBeenCalled();
    });
  });
});
