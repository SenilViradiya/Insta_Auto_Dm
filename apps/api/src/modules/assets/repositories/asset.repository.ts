import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import {
  InstagramAsset,
  InstagramProfile,
  InstagramAssetType,
  Prisma,
} from '@prisma/client';

export interface FindAssetsFilters {
  instagramAccountId?: string;
  assetType?: InstagramAssetType;
  mediaType?: string;
  isArchived?: boolean;
  search?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class AssetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertProfile(data: {
    instagramAccountId: string;
    username: string;
    name?: string | null;
    profilePictureUrl?: string | null;
    followers?: number;
    following?: number;
    mediaCount?: number;
    biography?: string | null;
    website?: string | null;
    lastSyncedAt?: Date;
  }): Promise<InstagramProfile> {
    return this.prisma.instagramProfile.upsert({
      where: { instagramAccountId: data.instagramAccountId },
      create: {
        instagramAccountId: data.instagramAccountId,
        username: data.username,
        name: data.name,
        profilePictureUrl: data.profilePictureUrl,
        followers: data.followers ?? 0,
        following: data.following ?? 0,
        mediaCount: data.mediaCount ?? 0,
        biography: data.biography,
        website: data.website,
        lastSyncedAt: data.lastSyncedAt ?? new Date(),
      },
      update: {
        username: data.username,
        name: data.name,
        profilePictureUrl: data.profilePictureUrl,
        followers: data.followers ?? 0,
        following: data.following ?? 0,
        mediaCount: data.mediaCount ?? 0,
        biography: data.biography,
        website: data.website,
        lastSyncedAt: data.lastSyncedAt ?? new Date(),
      },
    });
  }

  async getProfileByAccountId(
    instagramAccountId: string,
  ): Promise<InstagramProfile | null> {
    return this.prisma.instagramProfile.findUnique({
      where: { instagramAccountId },
    });
  }

  async findUniqueAsset(id: string): Promise<InstagramAsset | null> {
    return this.prisma.instagramAsset.findUnique({
      where: { id },
    });
  }

  async findUniqueAssetByMediaId(
    instagramAccountId: string,
    instagramMediaId: string,
  ): Promise<InstagramAsset | null> {
    return this.prisma.instagramAsset.findUnique({
      where: {
        instagramAccountId_instagramMediaId: {
          instagramAccountId,
          instagramMediaId,
        },
      },
    });
  }

  async bulkUpsertAssets(
    instagramAccountId: string,
    assets: Array<{
      instagramMediaId: string;
      assetType: InstagramAssetType;
      caption?: string | null;
      mediaType?: string | null;
      thumbnailUrl?: string | null;
      mediaUrl?: string | null;
      permalink?: string | null;
      shortCode?: string | null;
      timestamp?: Date | null;
      syncVersion: number;
    }>,
  ): Promise<void> {
    if (assets.length === 0) return;

    // Use a Prisma transaction to execute upserts cleanly in batch
    await this.prisma.$transaction(
      assets.map((asset) =>
        this.prisma.instagramAsset.upsert({
          where: {
            instagramAccountId_instagramMediaId: {
              instagramAccountId,
              instagramMediaId: asset.instagramMediaId,
            },
          },
          create: {
            instagramAccountId,
            instagramMediaId: asset.instagramMediaId,
            assetType: asset.assetType,
            caption: asset.caption,
            mediaType: asset.mediaType,
            thumbnailUrl: asset.thumbnailUrl,
            mediaUrl: asset.mediaUrl,
            permalink: asset.permalink,
            shortCode: asset.shortCode,
            timestamp: asset.timestamp,
            syncVersion: asset.syncVersion,
            isArchived: false,
          },
          update: {
            assetType: asset.assetType,
            caption: asset.caption,
            mediaType: asset.mediaType,
            thumbnailUrl: asset.thumbnailUrl,
            mediaUrl: asset.mediaUrl,
            permalink: asset.permalink,
            shortCode: asset.shortCode,
            timestamp: asset.timestamp,
            syncVersion: asset.syncVersion,
            isArchived: false,
          },
        }),
      ),
    );
  }

  async bulkArchiveMissing(
    instagramAccountId: string,
    activeSyncVersion: number,
  ): Promise<number> {
    const result = await this.prisma.instagramAsset.updateMany({
      where: {
        instagramAccountId,
        syncVersion: { not: activeSyncVersion },
        isArchived: false,
      },
      data: {
        isArchived: true,
      },
    });
    return result.count;
  }

  async findAssets(
    filters: FindAssetsFilters,
  ): Promise<{ total: number; items: InstagramAsset[] }> {
    const {
      instagramAccountId,
      assetType,
      mediaType,
      isArchived = false,
      search,
      createdAfter,
      createdBefore,
      page = 1,
      limit = 10,
    } = filters;

    const skip = (page - 1) * limit;
    const where: Prisma.InstagramAssetWhereInput = {
      isArchived,
    };

    if (instagramAccountId) {
      where.instagramAccountId = instagramAccountId;
    }
    if (assetType) {
      where.assetType = assetType;
    }
    if (mediaType) {
      where.mediaType = mediaType;
    }
    if (search) {
      where.caption = { contains: search, mode: 'insensitive' };
    }
    if (createdAfter || createdBefore) {
      where.timestamp = {};
      if (createdAfter) {
        where.timestamp.gte = createdAfter;
      }
      if (createdBefore) {
        where.timestamp.lte = createdBefore;
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.instagramAsset.count({ where }),
      this.prisma.instagramAsset.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { total, items };
  }
}
