import { Injectable, Logger } from '@nestjs/common';
import { AssetFetchException } from '../exceptions/assets.exceptions';

export interface MetaProfileData {
  id: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
  followers: number;
  following: number;
  mediaCount: number;
  biography?: string;
  website?: string;
}

export interface MetaMediaItemData {
  instagramMediaId: string;
  caption?: string;
  mediaType: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  permalink?: string;
  shortCode?: string;
  timestamp: Date;
}

export interface MetaMediaListResult {
  items: MetaMediaItemData[];
  nextCursor?: string;
}

@Injectable()
export class MetaAssetClient {
  private readonly logger = new Logger(MetaAssetClient.name);
  private readonly graphApiBaseUrl = 'https://graph.facebook.com/v20.0';

  private async fetchWithRetry(url: string, options: any, attempts = 3, delayMs = 1000): Promise<Response> {
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) {
          return response;
        }
        
        // 4xx client errors (except 429/rate-limits) should not be retried
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          return response;
        }
        
        this.logger.warn(`API request transient failure (Status: ${response.status}). Retrying... (Attempt ${i + 1}/${attempts})`);
      } catch (err: any) {
        if (i === attempts - 1) {
          throw err;
        }
        this.logger.warn(`API request connection failure: ${err.message}. Retrying... (Attempt ${i + 1}/${attempts})`);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, i)));
    }
    throw new Error(`Request failed after ${attempts} attempts`);
  }

  async fetchProfile(instagramUserId: string, accessToken: string): Promise<MetaProfileData> {
    const fields = 'id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography,website';
    const url = `${this.graphApiBaseUrl}/${instagramUserId}?fields=${fields}&access_token=${accessToken}`;

    try {
      const response = await this.fetchWithRetry(url, { method: 'GET' });
      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new AssetFetchException(
          `Failed to fetch Instagram profile (Status: ${response.status}): ${JSON.stringify(errorJson)}`
        );
      }

      const body = (await response.json()) as any;
      return {
        id: body.id,
        username: body.username,
        name: body.name,
        profilePictureUrl: body.profile_picture_url,
        followers: body.followers_count ?? 0,
        following: body.follows_count ?? 0,
        mediaCount: body.media_count ?? 0,
        biography: body.biography,
        website: body.website,
      };
    } catch (error: any) {
      if (error instanceof AssetFetchException) throw error;
      throw new AssetFetchException(`Connection error fetching profile: ${error.message}`);
    }
  }

  async fetchMediaList(
    instagramUserId: string,
    accessToken: string,
    limit = 100,
    after?: string
  ): Promise<MetaMediaListResult> {
    const fields = 'id,caption,media_type,thumbnail_url,media_url,permalink,shortcode,timestamp';
    let url = `${this.graphApiBaseUrl}/${instagramUserId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`;
    if (after) {
      url += `&after=${after}`;
    }

    try {
      const response = await this.fetchWithRetry(url, { method: 'GET' });
      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new AssetFetchException(
          `Failed to fetch Instagram media list (Status: ${response.status}): ${JSON.stringify(errorJson)}`
        );
      }

      const body = (await response.json()) as any;
      const rawItems = body.data || [];
      const nextCursor = body.paging?.cursors?.after ?? undefined;

      const items: MetaMediaItemData[] = rawItems.map((raw: any) => ({
        instagramMediaId: raw.id,
        caption: raw.caption,
        mediaType: raw.media_type,
        mediaUrl: raw.media_url,
        thumbnailUrl: raw.thumbnail_url,
        permalink: raw.permalink,
        shortCode: raw.shortcode,
        timestamp: raw.timestamp ? new Date(raw.timestamp) : new Date(),
      }));

      return { items, nextCursor };
    } catch (error: any) {
      if (error instanceof AssetFetchException) throw error;
      throw new AssetFetchException(`Connection error fetching media list: ${error.message}`);
    }
  }
}
