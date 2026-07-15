import { Injectable, Logger } from '@nestjs/common';
import { GraphClient } from '../clients/graph.client';

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
export class AssetService {
  private readonly logger = new Logger(AssetService.name);

  constructor(private readonly graphClient: GraphClient) {}

  async fetchMediaList(
    instagramUserId: string,
    accessToken: string,
    limit = 100,
    after?: string,
  ): Promise<MetaMediaListResult> {
    const fields =
      'id,caption,media_type,thumbnail_url,media_url,permalink,timestamp';
    const params: Record<string, string> = {
      fields,
      limit: String(limit),
    };
    if (after) {
      params['after'] = after;
    }

    const { data: rawItems, nextCursor } = await this.graphClient.paginate<any>(
      `${instagramUserId}/media`,
      accessToken,
      params,
    );

    const items: MetaMediaItemData[] = rawItems.map((raw: any) => {
      let shortCode: string | undefined = undefined;
      if (raw.permalink) {
        const match = raw.permalink.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
        if (match) {
          shortCode = match[1];
        }
      }

      return {
        instagramMediaId: raw.id,
        caption: raw.caption,
        mediaType: raw.media_type,
        mediaUrl: raw.media_url,
        thumbnailUrl: raw.thumbnail_url,
        permalink: raw.permalink,
        shortCode,
        timestamp: raw.timestamp ? new Date(raw.timestamp) : new Date(),
      };
    });

    return { items, nextCursor };
  }
}
