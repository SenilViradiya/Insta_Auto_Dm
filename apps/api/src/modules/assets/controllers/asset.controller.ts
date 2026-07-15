import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AssetService } from '../services/asset.service';
import { InstagramAssetType } from '@prisma/client';

@Controller()
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Post('assets/sync')
  @HttpCode(HttpStatus.OK)
  async syncAssets(
    @Headers('x-instagram-account-id') instagramAccountIdHeader?: string,
    @Query('instagramAccountId') instagramAccountIdQuery?: string,
  ) {
    const accountId = instagramAccountIdHeader || instagramAccountIdQuery;
    if (!accountId) {
      throw new BadRequestException(
        'x-instagram-account-id header or query param is required',
      );
    }
    return this.assetService.syncProfileAndAssets(accountId);
  }

  @Get('profile')
  async getProfile(
    @Headers('x-instagram-account-id') instagramAccountIdHeader?: string,
    @Query('instagramAccountId') instagramAccountIdQuery?: string,
  ) {
    const accountId = instagramAccountIdHeader || instagramAccountIdQuery;
    if (!accountId) {
      throw new BadRequestException(
        'x-instagram-account-id header or query param is required',
      );
    }
    const profile = await this.assetService.getProfile(accountId);
    if (!profile) {
      throw new NotFoundException(
        `Profile not found for account: ${accountId}`,
      );
    }
    return profile;
  }

  @Get('assets/profile')
  async getAssetProfile(
    @Headers('x-instagram-account-id') instagramAccountIdHeader?: string,
    @Query('instagramAccountId') instagramAccountIdQuery?: string,
  ) {
    return this.getProfile(instagramAccountIdHeader, instagramAccountIdQuery);
  }

  @Get('assets/reels')
  async getReels(
    @Headers('x-instagram-account-id') instagramAccountIdHeader?: string,
    @Query('instagramAccountId') instagramAccountIdQuery?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const accountId = instagramAccountIdHeader || instagramAccountIdQuery;
    if (!accountId) {
      throw new BadRequestException(
        'x-instagram-account-id header or query param is required',
      );
    }
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.assetService.getReels(accountId, pageNum, limitNum);
  }

  @Get('assets/posts')
  async getPosts(
    @Headers('x-instagram-account-id') instagramAccountIdHeader?: string,
    @Query('instagramAccountId') instagramAccountIdQuery?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const accountId = instagramAccountIdHeader || instagramAccountIdQuery;
    if (!accountId) {
      throw new BadRequestException(
        'x-instagram-account-id header or query param is required',
      );
    }
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.assetService.getPosts(accountId, pageNum, limitNum);
  }

  @Get('assets')
  async getAssets(
    @Headers('x-instagram-account-id') instagramAccountIdHeader?: string,
    @Query('instagramAccountId') instagramAccountIdQuery?: string,
    @Query('assetType') assetType?: string,
    @Query('mediaType') mediaType?: string,
    @Query('search') search?: string,
    @Query('createdAfter') createdAfter?: string,
    @Query('createdBefore') createdBefore?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const accountId = instagramAccountIdHeader || instagramAccountIdQuery;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    let parsedAssetType: InstagramAssetType | undefined;
    if (assetType) {
      if (Object.values(InstagramAssetType).includes(assetType as any)) {
        parsedAssetType = assetType as InstagramAssetType;
      } else {
        throw new BadRequestException(`Invalid assetType: ${assetType}`);
      }
    }

    return this.assetService.getAssets({
      instagramAccountId: accountId,
      assetType: parsedAssetType,
      mediaType,
      search,
      createdAfter: createdAfter ? new Date(createdAfter) : undefined,
      createdBefore: createdBefore ? new Date(createdBefore) : undefined,
      page: pageNum,
      limit: limitNum,
    });
  }

  @Get('assets/:id')
  async getAssetById(@Param('id') id: string) {
    const asset = await this.assetService.getAssetById(id);
    if (!asset) {
      throw new NotFoundException(`Asset not found with ID: ${id}`);
    }
    return asset;
  }
}
