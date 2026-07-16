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
  ) {}

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
      'pages_show_list',
      'business_management',
      'pages_messaging',
      'pages_read_engagement',
    ];

    const url = new URL(`https://www.facebook.com/${version}/dialog/oauth`);
    url.searchParams.append('client_id', appId);
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('scope', scopes.join(','));
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('state', 'instagram_dm_auth');

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
      this.logger.error(`Meta API code exchange failed: ${e.message}`);
      throw new BadRequestException('Failed to exchange code with Meta');
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
        `Meta API long-lived token exchange failed: ${e.message}`,
      );
      throw new BadRequestException('Failed to obtain long-lived token');
    }
  }

  async fetchUserPages(
    longToken: string,
  ): Promise<Array<{ id: string; name: string; access_token: string }>> {
    try {
      const response = await this.graphClient.request<{
        data?: Array<{ id: string; name: string; access_token: string }>;
      }>({
        method: 'GET',
        endpoint: 'me/accounts',
        token: longToken,
      });
      return response.data ?? [];
    } catch (e: any) {
      this.logger.error(`Meta API me/accounts failed: ${e.message}`);
      throw new BadRequestException('Failed to retrieve connected Meta Pages');
    }
  }

  async fetchPageInstagramAccount(
    pageId: string,
    pageToken: string,
  ): Promise<{
    instagram_business_account?: { id: string };
    name: string;
  } | null> {
    try {
      return await this.graphClient.request({
        method: 'GET',
        endpoint: pageId,
        params: {
          fields: 'instagram_business_account,name',
        },
        token: pageToken,
      });
    } catch (e: any) {
      this.logger.warn(`Failed to inspect page ${pageId}: ${e.message}`);
      return null;
    }
  }

  async exchangeCodeAndConnect(code: string): Promise<void> {
    this.logger.log('Initiating OAuth process with authorization code');
    const { access_token: shortToken } = await this.fetchShortLivedToken(code);

    this.logger.log('Exchanging short-lived token for long-lived User token');
    const { access_token: longToken, expires_in } =
      await this.fetchLongLivedToken(shortToken);

    this.logger.log('Fetching Meta pages list');
    const pages = await this.fetchUserPages(longToken);

    if (pages.length === 0) {
      throw new BadRequestException(
        'No Meta Pages associated with this account',
      );
    }

    let connectedCount = 0;
    const encryptionKey = this.getEnvOrThrow('TOKEN_ENCRYPTION_KEY');

    // Calculate expiry date if expires_in is provided
    const tokenExpiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : null;

    // Encrypt the long-lived token before storage
    const accessTokenEncrypted = encryptToken(longToken, encryptionKey);

    for (const page of pages) {
      const pageDetails = await this.fetchPageInstagramAccount(
        page.id,
        page.access_token,
      );
      if (pageDetails?.instagram_business_account?.id) {
        const instagramUserId = pageDetails.instagram_business_account.id;

        // Automatically register Webhook App Subscription for this connected Page.
        //
        // IMPORTANT: Instagram comment/mention events are configured in the Meta App Dashboard
        // (Webhooks → Instagram object → subscribe to 'comments','mentions' fields).
        // This subscribed_apps API call only activates the Page-level subscription so
        // Meta will route any Page events (DMs, postbacks) through our webhook URL.
        // "instagram_manage_comments" is an OAuth scope, NOT a valid subscribed_field.
        try {
          this.logger.log(`Registering webhook app subscription for page ${page.id}...`);
          await this.graphClient.request({
            method: 'POST',
            endpoint: `${page.id}/subscribed_apps`,
            params: {
              // Valid Page-level webhook fields only.
              // Instagram-level fields (comments, mentions) are managed in App Dashboard.
              subscribed_fields: 'messages,messaging_postbacks',
              access_token: page.access_token,
            },
          });
          this.logger.log(`Successfully registered webhook app subscription for page ${page.id}`);
        } catch (subErr: any) {
          this.logger.warn(
            `Failed to register webhook app subscription for page ${page.id}: ${subErr.message}`,
          );
        }

        // Upsert connected Account in database
        await this.prisma.instagramAccount.upsert({
          where: { instagramUserId },
          create: {
            instagramUserId,
            pageId: page.id,
            pageName: pageDetails.name,
            accessTokenEncrypted,
            tokenExpiresAt,
          },
          update: {
            pageId: page.id,
            pageName: pageDetails.name,
            accessTokenEncrypted,
            tokenExpiresAt,
          },
        });

        this.logger.log(
          `Successfully connected Instagram Business Account: ${instagramUserId}`,
        );
        connectedCount++;
      }
    }

    if (connectedCount === 0) {
      throw new BadRequestException(
        'No pages with linked Instagram Business accounts were found',
      );
    }
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
