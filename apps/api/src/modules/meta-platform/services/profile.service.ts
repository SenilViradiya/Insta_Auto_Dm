import { Injectable, Logger } from '@nestjs/common';
import { GraphClient } from '../clients/graph.client';

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

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private readonly graphClient: GraphClient) {}

  async fetchProfile(instagramUserId: string, accessToken: string): Promise<MetaProfileData> {
    const fields = 'id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography,website';
    
    const body = await this.graphClient.request({
      method: 'GET',
      endpoint: instagramUserId,
      token: accessToken,
      params: { fields },
    });

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
  }
}
