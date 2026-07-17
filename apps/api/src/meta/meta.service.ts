import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { encryptToken } from '../modules/meta-platform/utils/crypto.utils';
import { GraphClient } from '../modules/meta-platform/clients/graph.client';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graphClient: GraphClient,
  ) { }

  private getEnvOrThrow(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Environment variable ${key} is not configured`);
    }
    return value;
  }

  getLoginUrl(): string {
    const appId = this.getEnvOrThrow('META_APP_ID');
    const redirectUri = this.getEnvOrThrow('META_REDIRECT_URI');
    const version = process.env.META_GRAPH_API_VERSION ?? 'v20.0';

    const scopes = [
      'instagram_basic',
      'instagram_manage_messages',
      'instagram_manage_comments',
    ];

    const url = new URL(`https://www.facebook.com/${version}/dialog/oauth`);
    url.searchParams.append('client_id', appId);
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('scope', scopes.join(','));
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('state', 'instagram_login_direct');

    return url.toString();
  }

  async fetchShortLivedToken(
    code: string,
  ): Promise<{ access_token: string; expires_in?: number }> {
    const appId = this.getEnvOrThrow('META_APP_ID');
    const appSecret = this.getEnvOrThrow('META_APP_SECRET');
    const redirectUri = this.getEnvOrThrow('META_REDIRECT_URI');

    try {
      return await this.graphClient.request({
        method: 'GET',
        endpoint: 'oauth/access_token',
        params: {
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code,
        },
      });
    } catch (e: any) {
      this.logger.error(`Meta/Instagram code exchange failed: ${e.message}`);
      throw new BadRequestException('Failed to exchange code with Meta/Instagram');
    }
  }

  async fetchLongLivedToken(
    shortToken: string,
  ): Promise<{ access_token: string; expires_in?: number }> {
    const appId = this.getEnvOrThrow('META_APP_ID');
    const appSecret = this.getEnvOrThrow('META_APP_SECRET');

    try {
      return await this.graphClient.request({
        method: 'GET',
        endpoint: 'oauth/access_token',
        params: {
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: shortToken,
        },
      });
    } catch (e: any) {
      this.logger.error(
        `Meta/Instagram long-lived token exchange failed: ${e.message}`,
      );
      throw new BadRequestException('Failed to obtain long-lived token');
    }
  }

  async fetchInstagramProfile(
    accessToken: string,
  ): Promise<{ id: string; username: string; name?: string; profile_picture_url?: string }> {
    try {
      return await this.graphClient.request({
        method: 'GET',
        endpoint: 'me',
        params: {
          fields: 'id,username,name,profile_picture_url',
        },
        token: accessToken,
      });
    } catch (e: any) {
      this.logger.error(`Instagram profile query failed: ${e.message}`);
      throw new BadRequestException('Failed to retrieve Instagram profile information');
    }
  }

  async exchangeCodeAndConnect(code: string): Promise<void> {
    this.logger.log('Initiating direct Instagram Login process');
    const { access_token: shortToken } = await this.fetchShortLivedToken(code);

    this.logger.log('Exchanging short-lived token for long-lived User token');
    const { access_token: longToken, expires_in } =
      await this.fetchLongLivedToken(shortToken);

    this.logger.log('Retrieving Instagram user profile directly');
    const profile = await this.fetchInstagramProfile(longToken);

    const encryptionKey = this.getEnvOrThrow('TOKEN_ENCRYPTION_KEY');
    const accessTokenEncrypted = encryptToken(longToken, encryptionKey);
    const tokenExpiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : null;

    // Check if account already exists to preserve legacy details
    const existingAccount = await this.prisma.instagramAccount.findUnique({
      where: { instagramUserId: profile.id },
    });

    const pageId = existingAccount ? existingAccount.pageId : 'instagram_login';
    const pageName = existingAccount ? existingAccount.pageName : profile.username;

    // Save/Update account details
    const account = await this.prisma.instagramAccount.upsert({
      where: { instagramUserId: profile.id },
      create: {
        instagramUserId: profile.id,
        pageId,
        pageName,
        accessTokenEncrypted,
        tokenExpiresAt,
      },
      update: {
        accessTokenEncrypted,
        tokenExpiresAt,
      },
    });

    // Save/Update associated profile details
    await this.prisma.instagramProfile.upsert({
      where: { instagramAccountId: account.id },
      create: {
        instagramAccountId: account.id,
        username: profile.username,
        name: profile.name || profile.username,
        profilePictureUrl: profile.profile_picture_url || null,
      },
      update: {
        username: profile.username,
        name: profile.name || profile.username,
        profilePictureUrl: profile.profile_picture_url || null,
      },
    });

    this.logger.log(
      `Successfully registered/updated Instagram Login Account: ${profile.id} (@${profile.username})`,
    );
  }

  async getStatus(): Promise<
    Array<{
      id: string;
      instagramUserId: string;
      pageId: string;
      pageName: string;
      connectedAt: Date;
      tokenExpiresAt: Date | null;
    }>
  > {
    return this.prisma.instagramAccount.findMany({
      select: {
        id: true,
        instagramUserId: true,
        pageId: true,
        pageName: true,
        connectedAt: true,
        tokenExpiresAt: true,
      },
    });
  }

  async disconnect(id: string): Promise<void> {
    try {
      await this.prisma.instagramAccount.delete({
        where: { id },
      });
      this.logger.log(`Successfully disconnected Instagram account ${id}`);
    } catch (e) {
      this.logger.error(
        `Error disconnecting Instagram account ${id}: ${String(e)}`,
      );
      throw new BadRequestException(
        'Account not found or already disconnected',
      );
    }
  }
}
