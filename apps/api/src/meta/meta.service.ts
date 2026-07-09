import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { encryptToken } from './crypto.utils';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);

  constructor(private readonly prisma: PrismaService) {}

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
      'pages_manage_metadata',
      'pages_show_list',
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
    const version = process.env.META_GRAPH_API_VERSION ?? 'v20.0';

    const url = new URL(
      `https://graph.facebook.com/${version}/oauth/access_token`,
    );
    url.searchParams.append('client_id', appId);
    url.searchParams.append('client_secret', appSecret);
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('code', code);

    const response = await fetch(url.toString());
    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`Meta API code exchange failed: ${errText}`);
      throw new BadRequestException('Failed to exchange code with Meta');
    }

    return response.json() as Promise<{
      access_token: string;
      expires_in?: number;
    }>;
  }

  async fetchLongLivedToken(
    shortToken: string,
  ): Promise<{ access_token: string; expires_in?: number }> {
    const appId = this.getEnvOrThrow('META_APP_ID');
    const appSecret = this.getEnvOrThrow('META_APP_SECRET');
    const version = process.env.META_GRAPH_API_VERSION ?? 'v20.0';

    const url = new URL(
      `https://graph.facebook.com/${version}/oauth/access_token`,
    );
    url.searchParams.append('grant_type', 'fb_exchange_token');
    url.searchParams.append('client_id', appId);
    url.searchParams.append('client_secret', appSecret);
    url.searchParams.append('fb_exchange_token', shortToken);

    const response = await fetch(url.toString());
    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(
        `Meta API long-lived token exchange failed: ${errText}`,
      );
      throw new BadRequestException('Failed to obtain long-lived token');
    }

    return response.json() as Promise<{
      access_token: string;
      expires_in?: number;
    }>;
  }

  async fetchUserPages(
    longToken: string,
  ): Promise<Array<{ id: string; name: string; access_token: string }>> {
    const version = process.env.META_GRAPH_API_VERSION ?? 'v20.0';
    const url = `https://graph.facebook.com/${version}/me/accounts`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${longToken}` },
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`Meta API me/accounts failed: ${errText}`);
      throw new BadRequestException('Failed to retrieve connected Meta Pages');
    }

    const json = (await response.json()) as {
      data?: Array<{ id: string; name: string; access_token: string }>;
    };
    return json.data ?? [];
  }

  async fetchPageInstagramAccount(
    pageId: string,
    pageToken: string,
  ): Promise<{
    instagram_business_account?: { id: string };
    name: string;
  } | null> {
    const version = process.env.META_GRAPH_API_VERSION ?? 'v20.0';
    const url = `https://graph.facebook.com/${version}/${pageId}?fields=instagram_business_account,name`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${pageToken}` },
    });

    if (!response.ok) {
      this.logger.warn(
        `Failed to inspect page ${pageId}: ${await response.text()}`,
      );
      return null;
    }

    return response.json() as Promise<{
      instagram_business_account?: { id: string };
      name: string;
    }>;
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
    }>
  > {
    return this.prisma.instagramAccount.findMany({
      select: {
        id: true,
        instagramUserId: true,
        pageId: true,
        pageName: true,
        connectedAt: true,
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
