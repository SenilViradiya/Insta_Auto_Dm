import { Test, TestingModule } from '@nestjs/testing';
import { AssetController } from '../controllers/asset.controller';
import { AssetService } from '../services/asset.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InstagramAssetType } from '@prisma/client';

describe('AssetController', () => {
  let controller: AssetController;
  let service: AssetService;

  const mockAssetService = {
    syncProfileAndAssets: jest.fn(),
    getProfile: jest.fn(),
    getAssetById: jest.fn(),
    getAssets: jest.fn(),
    getReels: jest.fn(),
    getPosts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssetController],
      providers: [{ provide: AssetService, useValue: mockAssetService }],
    }).compile();

    controller = module.get<AssetController>(AssetController);
    service = module.get<AssetService>(AssetService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncAssets', () => {
    it('throws BadRequestException if no account ID provided', async () => {
      await expect(controller.syncAssets(undefined, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('triggers sync with account ID from header', async () => {
      mockAssetService.syncProfileAndAssets.mockResolvedValue({
        success: true,
      });
      const res = await controller.syncAssets('acc-1', undefined);
      expect(res).toEqual({ success: true });
      expect(service.syncProfileAndAssets).toHaveBeenCalledWith('acc-1');
    });

    it('triggers sync with account ID from query param', async () => {
      mockAssetService.syncProfileAndAssets.mockResolvedValue({
        success: true,
      });
      const res = await controller.syncAssets(undefined, 'acc-2');
      expect(res).toEqual({ success: true });
      expect(service.syncProfileAndAssets).toHaveBeenCalledWith('acc-2');
    });
  });

  describe('getProfile', () => {
    it('throws BadRequestException if no account ID provided', async () => {
      await expect(controller.getProfile(undefined, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('returns profile if found', async () => {
      const mockProfile = { id: 'prof-1', username: 'johndoe' };
      mockAssetService.getProfile.mockResolvedValue(mockProfile);
      const res = await controller.getProfile('acc-1', undefined);
      expect(res).toEqual(mockProfile);
    });

    it('throws NotFoundException if profile not found', async () => {
      mockAssetService.getProfile.mockResolvedValue(null);
      await expect(controller.getProfile('acc-1', undefined)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getReels', () => {
    it('passes pagination parameters correctly', async () => {
      mockAssetService.getReels.mockResolvedValue({ total: 10, items: [] });
      await controller.getReels('acc-1', undefined, '2', '5');
      expect(service.getReels).toHaveBeenCalledWith('acc-1', 2, 5);
    });
  });

  describe('getPosts', () => {
    it('passes pagination parameters correctly', async () => {
      mockAssetService.getPosts.mockResolvedValue({ total: 5, items: [] });
      await controller.getPosts('acc-1', undefined, '3', '12');
      expect(service.getPosts).toHaveBeenCalledWith('acc-1', 3, 12);
    });
  });

  describe('getAssets', () => {
    it('passes query filters to the service query method', async () => {
      mockAssetService.getAssets.mockResolvedValue({ total: 100, items: [] });
      await controller.getAssets(
        'acc-1',
        undefined,
        'POST',
        'IMAGE',
        'summer',
        '2026-07-01',
        '2026-07-10',
        '1',
        '20',
      );
      expect(service.getAssets).toHaveBeenCalledWith({
        instagramAccountId: 'acc-1',
        assetType: InstagramAssetType.POST,
        mediaType: 'IMAGE',
        search: 'summer',
        createdAfter: new Date('2026-07-01'),
        createdBefore: new Date('2026-07-10'),
        page: 1,
        limit: 20,
      });
    });

    it('throws BadRequestException for invalid assetType query parameter value', async () => {
      await expect(
        controller.getAssets('acc-1', undefined, 'INVALID_ASSET_TYPE'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAssetById', () => {
    it('returns asset if exists', async () => {
      const mockAsset = { id: 'asset-1', caption: 'Hello' };
      mockAssetService.getAssetById.mockResolvedValue(mockAsset);
      const res = await controller.getAssetById('asset-1');
      expect(res).toEqual(mockAsset);
    });

    it('throws NotFoundException if asset does not exist', async () => {
      mockAssetService.getAssetById.mockResolvedValue(null);
      await expect(controller.getAssetById('asset-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
