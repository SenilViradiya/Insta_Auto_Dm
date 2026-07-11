import { Injectable } from '@nestjs/common';
import { ProfileService, MetaProfileData } from '../../meta-platform/services/profile.service';
import { AssetService, MetaMediaListResult, MetaMediaItemData } from '../../meta-platform/services/asset.service';

export { MetaProfileData, MetaMediaItemData, MetaMediaListResult };

@Injectable()
export class MetaAssetClient {
  constructor(
    private readonly profileService: ProfileService,
    private readonly assetService: AssetService,
  ) {}

  async fetchProfile(instagramUserId: string, accessToken: string): Promise<MetaProfileData> {
    return this.profileService.fetchProfile(instagramUserId, accessToken);
  }

  async fetchMediaList(
    instagramUserId: string,
    accessToken: string,
    limit = 100,
    after?: string,
  ): Promise<MetaMediaListResult> {
    return this.assetService.fetchMediaList(
      instagramUserId,
      accessToken,
      limit,
      after,
    );
  }
}
