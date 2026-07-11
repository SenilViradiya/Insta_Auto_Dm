import { Injectable, Logger } from '@nestjs/common';
import { AssetRepository, FindAssetsFilters } from '../repositories/asset.repository';
import { MetaAssetClient, MetaMediaItemData } from '../clients/meta-asset.client';
import { PrismaService } from '../../../prisma.service';
import { decryptToken } from '../../../meta/crypto.utils';
import {
  AssetSyncException,
  ProfileSyncException,
} from '../exceptions/assets.exceptions';
import { InstagramAsset, InstagramProfile, InstagramAssetType } from '@prisma/client';

@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly assetRepo: AssetRepository,
    private readonly metaClient: MetaAssetClient
  ) {}

  private getEncryptionKey(): string {
    const key = process.env.TOKEN_ENCRYPTION_KEY;
    if (!key) {
      throw new AssetSyncException('TOKEN_ENCRYPTION_KEY is not configured');
    }
    return key;
  }

  async syncProfileAndAssets(instagramAccountId: string): Promise<{
    profile: InstagramProfile;
    syncedAssetsCount: number;
    archivedAssetsCount: number;
  }> {
    this.logger.log(`Starting media and profile synchronization for account: ${instagramAccountId}`);

    // 1. Fetch Instagram Account details
    const account = await this.prisma.instagramAccount.findUnique({
      where: { id: instagramAccountId },
    });

    if (!account) {
      throw new AssetSyncException(`Instagram account with ID ${instagramAccountId} not found`);
    }

    // 2. Decrypt standard Meta Page/Account access token
    let decryptedToken: string;
    try {
      decryptedToken = decryptToken(account.accessTokenEncrypted, this.getEncryptionKey());
    } catch (e: any) {
      throw new AssetSyncException(`Failed to decrypt access token: ${e.message}`);
    }

    // 3. Synchronize Profile
    let profile: InstagramProfile;
    try {
      const metaProfile = await this.metaClient.fetchProfile(account.instagramUserId, decryptedToken);
      profile = await this.assetRepo.upsertProfile({
        instagramAccountId,
        username: metaProfile.username,
        name: metaProfile.name,
        profilePictureUrl: metaProfile.profilePictureUrl,
        followers: metaProfile.followers,
        following: metaProfile.following,
        mediaCount: metaProfile.mediaCount,
        biography: metaProfile.biography,
        website: metaProfile.website,
        lastSyncedAt: new Date(),
      });
    } catch (e: any) {
      throw new ProfileSyncException(`Failed to sync Instagram profile info: ${e.message}`);
    }

    // 4. Synchronize Assets (Loop fetch pages with cursor cursors)
    const mediaItems: MetaMediaItemData[] = [];
    try {
      let afterCursor: string | undefined = undefined;
      let keepFetching = true;
      const maxSyncLimit = 1000;

      while (keepFetching && mediaItems.length < maxSyncLimit) {
        const result = await this.metaClient.fetchMediaList(
          account.instagramUserId,
          decryptedToken,
          100,
          afterCursor
        );

        if (result.items.length > 0) {
          mediaItems.push(...result.items);
        }

        if (result.nextCursor && result.items.length > 0) {
          afterCursor = result.nextCursor;
        } else {
          keepFetching = false;
        }
      }
    } catch (e: any) {
      throw new AssetSyncException(`Failed to fetch Instagram asset list: ${e.message}`);
    }

    // 5. Bulk Upsert into database
    const syncVersion = Math.floor(Date.now() / 1000);
    const mappedAssets = mediaItems.map((item) => {
      // Map raw media types into InstagramAssetType enum
      const permalink = item.permalink || '';
      let assetType: InstagramAssetType = InstagramAssetType.POST; // explicitly set type
      
      if (item.mediaType === 'CAROUSEL_ALBUM') {
        assetType = InstagramAssetType.CAROUSEL;
      } else if (item.mediaType === 'IMAGE') {
        assetType = InstagramAssetType.IMAGE;
      } else if (item.mediaType === 'VIDEO') {
        if (permalink.includes('/reel/')) {
          assetType = InstagramAssetType.REEL;
        } else {
          assetType = InstagramAssetType.VIDEO;
        }
      }

      return {
        instagramMediaId: item.instagramMediaId,
        assetType,
        caption: item.caption ?? null,
        mediaType: item.mediaType ?? null,
        thumbnailUrl: item.thumbnailUrl ?? null,
        mediaUrl: item.mediaUrl ?? null,
        permalink: item.permalink ?? null,
        shortCode: item.shortCode ?? null,
        timestamp: item.timestamp,
        syncVersion,
      };
    });

    try {
      await this.assetRepo.bulkUpsertAssets(instagramAccountId, mappedAssets);
    } catch (e: any) {
      throw new AssetSyncException(`Failed to persist synchronized assets: ${e.message}`);
    }

    // 6. Soft archive missing/deleted media
    let archivedCount = 0;
    try {
      archivedCount = await this.assetRepo.bulkArchiveMissing(instagramAccountId, syncVersion);
    } catch (e: any) {
      throw new AssetSyncException(`Failed to archive missing Instagram assets: ${e.message}`);
    }

    this.logger.log(`Completed sync: ${mappedAssets.length} active, ${archivedCount} archived.`);

    return {
      profile,
      syncedAssetsCount: mappedAssets.length,
      archivedAssetsCount: archivedCount,
    };
  }

  async getProfile(instagramAccountId: string): Promise<InstagramProfile | null> {
    return this.assetRepo.getProfileByAccountId(instagramAccountId);
  }

  async getAssetById(id: string): Promise<InstagramAsset | null> {
    return this.assetRepo.findUniqueAsset(id);
  }

  async getAssets(filters: FindAssetsFilters): Promise<{ total: number; items: InstagramAsset[] }> {
    return this.assetRepo.findAssets(filters);
  }

  async getReels(
    instagramAccountId: string,
    page = 1,
    limit = 10
  ): Promise<{ total: number; items: InstagramAsset[] }> {
    return this.assetRepo.findAssets({
      instagramAccountId,
      assetType: InstagramAssetType.REEL,
      page,
      limit,
    });
  }

  async getPosts(
    instagramAccountId: string,
    page = 1,
    limit = 10
  ): Promise<{ total: number; items: InstagramAsset[] }> {
    return this.assetRepo.findAssets({
      instagramAccountId,
      assetType: InstagramAssetType.POST,
      page,
      limit,
    });
  }
}
