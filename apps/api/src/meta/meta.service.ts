import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { encryptToken } from './crypto.utils';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);

  private debugSteps = {
    step1: 'FAIL',
    step2: 'FAIL',
    step3: 'FAIL',
    step4: 'FAIL',
    step5: 'FAIL',
    step6: 'FAIL',
    step7: 'FAIL',
    step8: 'FAIL',
    step9: 'FAIL',
  };

  private lastParsedAccountsResponse: unknown = null;

  constructor(private readonly prisma: PrismaService) {}

  private getEnvOrThrow(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Environment variable ${key} is not configured`);
    }
    return value;
  }

  private maskToken(token?: string): string {
    if (!token) return 'null';
    return token.length > 10 ? token.substring(0, 10) + '...' : token;
  }

  private logMetaError(
    url: string,
    status: number,
    rawBody: string,
    stepNumber: number,
  ) {
    if (process.env.META_DEBUG !== 'true') return;

    let errorCode = 'N/A';
    let errorSubcode = 'N/A';
    let errorMessage = 'N/A';
    try {
      const jsonErr = JSON.parse(rawBody) as Record<string, unknown>;
      if (jsonErr && typeof jsonErr === 'object' && 'error' in jsonErr) {
        const errorObj = jsonErr.error as
          Record<string, unknown> | null | undefined;
        if (errorObj) {
          const codeVal = errorObj.code;
          if (typeof codeVal === 'string') {
            errorCode = codeVal;
          } else if (
            typeof codeVal === 'number' ||
            typeof codeVal === 'boolean'
          ) {
            errorCode = String(codeVal);
          }

          const subcodeVal = errorObj.error_subcode;
          if (typeof subcodeVal === 'string') {
            errorSubcode = subcodeVal;
          } else if (
            typeof subcodeVal === 'number' ||
            typeof subcodeVal === 'boolean'
          ) {
            errorSubcode = String(subcodeVal);
          }

          const messageVal = errorObj.message;
          if (typeof messageVal === 'string') {
            errorMessage = messageVal;
          } else if (
            typeof messageVal === 'number' ||
            typeof messageVal === 'boolean'
          ) {
            errorMessage = String(messageVal);
          }
        }
      }
    } catch {
      void 0;
    }

    const maskedUrl = url.replace(
      /access_token=([^&]+)/g,
      (match: string, token: string) => {
        return (
          'access_token=' +
          (token.length > 10 ? token.substring(0, 10) + '...' : token)
        );
      },
    );

    this.logger.log(
      `===== META ERROR =====\nURL: ${maskedUrl}\nHTTP Status: ${status}\nRaw Response Body: ${rawBody}\nGraph Error Code: ${errorCode}\nGraph Error Subcode: ${errorSubcode}\nGraph Error Message: ${errorMessage}\nRequest Step Number: ${stepNumber}`,
    );
  }

  getLoginUrl(): string {
    const appId = this.getEnvOrThrow('META_APP_ID');
    const redirectUri = this.getEnvOrThrow('META_REDIRECT_URI');
    const version = process.env.META_GRAPH_API_VERSION ?? 'v20.0';

    const scopes = [
      'instagram_basic',
      'instagram_manage_messages',
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

    const metaDebug = process.env.META_DEBUG === 'true';

    try {
      const response = await fetch(url.toString());
      const rawText = await response.text();

      if (!response.ok) {
        this.logMetaError(url.toString(), response.status, rawText, 1);
        this.logger.error(`Meta API code exchange failed: ${rawText}`);
        throw new BadRequestException('Failed to exchange code with Meta');
      }

      const data = JSON.parse(rawText) as {
        access_token: string;
        expires_in?: number;
      };

      if (metaDebug) {
        const tokenExists = !!data.access_token;
        const expiresIn =
          data.expires_in !== undefined ? String(data.expires_in) : 'N/A';
        const masked = this.maskToken(data.access_token);
        this.logger.log(
          `===== STEP 1 =====\nStatus: PASS\nToken Exists: ${tokenExists}\nExpires In: ${expiresIn}\nMasked Token: ${masked}`,
        );
      }

      return data;
    } catch (e) {
      if (metaDebug) {
        this.logger.log(
          `===== STEP 1 =====\nStatus: FAIL\nToken Exists: false\nExpires In: N/A\nMasked Token: N/A`,
        );
      }
      throw e;
    }
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

    const metaDebug = process.env.META_DEBUG === 'true';

    try {
      const response = await fetch(url.toString());
      const rawText = await response.text();

      if (!response.ok) {
        this.logMetaError(url.toString(), response.status, rawText, 2);
        this.logger.error(
          `Meta API long-lived token exchange failed: ${rawText}`,
        );
        throw new BadRequestException('Failed to obtain long-lived token');
      }

      const data = JSON.parse(rawText) as {
        access_token: string;
        expires_in?: number;
      };

      if (metaDebug) {
        const expiresIn =
          data.expires_in !== undefined ? String(data.expires_in) : 'N/A';
        const masked = this.maskToken(data.access_token);
        this.logger.log(
          `===== STEP 2 =====\nStatus: PASS\nExpires In: ${expiresIn}\nMasked Token: ${masked}`,
        );
      }

      return data;
    } catch (e) {
      if (metaDebug) {
        this.logger.log(
          `===== STEP 2 =====\nStatus: FAIL\nExpires In: N/A\nMasked Token: N/A`,
        );
      }
      throw e;
    }
  }

  async fetchUserPages(
    longToken: string,
  ): Promise<Array<{ id: string; name: string; access_token: string }>> {
    const version = process.env.META_GRAPH_API_VERSION ?? 'v20.0';
    const params = new URLSearchParams();
    params.append('access_token', longToken);
    const url = `https://graph.facebook.com/${version}/me/accounts?${params.toString()}`;

    const metaDebug = process.env.META_DEBUG === 'true';

    const response = await fetch(url);
    const rawText = await response.text();

    if (metaDebug) {
      const graphUrlWithoutToken = `https://graph.facebook.com/${version}/me/accounts`;
      this.logger.log(
        `===== META DEBUG =====\n\nURL:\n${graphUrlWithoutToken}\n\nHTTP STATUS:\n${response.status}\n\nRAW RESPONSE:\n${rawText}`,
      );
    }

    if (!response.ok) {
      this.logMetaError(url, response.status, rawText, 4);
      this.logger.error(`Meta API me/accounts failed: ${rawText}`);
      throw new BadRequestException('Failed to retrieve connected Meta Pages');
    }

    const json = JSON.parse(rawText) as {
      data?: Array<{
        id: string;
        name: string;
        access_token: string;
        tasks?: string[];
        category?: string;
      }>;
    };

    this.lastParsedAccountsResponse = json;

    const pages = json.data ?? [];

    if (metaDebug) {
      this.logger.log(`Pages returned: ${pages.length}`);
      for (const page of pages) {
        const maskedPage = {
          ...page,
          access_token: this.maskToken(page.access_token),
        };
        this.logger.log(JSON.stringify(maskedPage, null, 2));
      }
    }

    return pages;
  }

  async fetchPageInstagramAccount(
    pageId: string,
    pageToken: string,
  ): Promise<{
    instagram_business_account?: { id: string };
    name: string;
  } | null> {
    const version = process.env.META_GRAPH_API_VERSION ?? 'v20.0';
    const params = new URLSearchParams();
    params.append('fields', 'id,name,instagram_business_account');
    params.append('access_token', pageToken);
    const url = `https://graph.facebook.com/${version}/${pageId}?${params.toString()}`;

    const metaDebug = process.env.META_DEBUG === 'true';

    try {
      const response = await fetch(url);
      const rawText = await response.text();

      if (metaDebug) {
        this.logger.log(
          `===== STEP 7 =====\nComplete JSON Response: ${rawText}`,
        );
      }

      if (!response.ok) {
        this.logMetaError(url, response.status, rawText, 7);
        this.logger.warn(`Failed to inspect page ${pageId}: ${rawText}`);
        return null;
      }

      const data = JSON.parse(rawText) as {
        instagram_business_account?: { id: string };
        name: string;
      };

      return data;
    } catch (e) {
      this.logger.error(
        `Error during fetchPageInstagramAccount of page ${pageId}: ${String(e)}`,
      );
      return null;
    }
  }

  async exchangeCodeAndConnect(code: string): Promise<void> {
    const metaDebug = process.env.META_DEBUG === 'true';
    this.debugSteps = {
      step1: 'FAIL',
      step2: 'FAIL',
      step3: 'FAIL',
      step4: 'FAIL',
      step5: 'FAIL',
      step6: 'FAIL',
      step7: 'FAIL',
      step8: 'FAIL',
      step9: 'FAIL',
    };

    try {
      this.logger.log('Initiating OAuth process with authorization code');
      const { access_token: shortToken } =
        await this.fetchShortLivedToken(code);
      this.debugSteps.step1 = 'PASS';

      this.logger.log('Exchanging short-lived token for long-lived User token');
      const { access_token: longToken, expires_in } =
        await this.fetchLongLivedToken(shortToken);
      this.debugSteps.step2 = 'PASS';

      // ===== STEP 3 =====
      if (metaDebug) {
        const version = process.env.META_GRAPH_API_VERSION ?? 'v20.0';
        const params = new URLSearchParams();
        params.append('fields', 'id,name');
        params.append('access_token', longToken);
        const meUrl = `https://graph.facebook.com/${version}/me?${params.toString()}`;

        try {
          const meRes = await fetch(meUrl);
          const meText = await meRes.text();
          this.logger.log(
            `===== STEP 3 =====\nHTTP Status: ${meRes.status}\nComplete JSON Response: ${meText}`,
          );

          if (meRes.ok) {
            this.debugSteps.step3 = 'PASS';
          } else {
            this.logMetaError(meUrl, meRes.status, meText, 3);
            this.debugSteps.step3 = 'FAIL';
          }
        } catch (meError) {
          this.logger.error('Failed during Step 3 GET /me request', meError);
          this.debugSteps.step3 = 'FAIL';
        }
      } else {
        this.debugSteps.step3 = 'PASS';
      }

      this.logger.log('Fetching Meta pages list');
      let pages: Array<{
        id: string;
        name: string;
        access_token: string;
        tasks?: string[];
        category?: string;
      }> = [];
      try {
        pages = await this.fetchUserPages(longToken);
        this.debugSteps.step4 = 'PASS';
        this.debugSteps.step5 = 'PASS';
      } catch (err) {
        this.debugSteps.step4 = 'FAIL';
        this.debugSteps.step5 = 'FAIL';
        throw err;
      }

      this.debugSteps.step6 = pages.length > 0 ? 'PASS' : 'FAIL';

      if (pages.length === 0) {
        if (metaDebug) {
          this.logger.log(
            `===== STEP 6 =====\nThe COMPLETE parsed object: ${JSON.stringify(this.lastParsedAccountsResponse)}`,
          );
        }
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

      let step7Passed = false;
      let step8Passed = false;

      for (const page of pages) {
        const pageDetails = await this.fetchPageInstagramAccount(
          page.id,
          page.access_token,
        );
        if (pageDetails) {
          step7Passed = true;
          if (pageDetails.instagram_business_account?.id) {
            step8Passed = true;
            if (metaDebug) {
              this.logger.log(
                `Instagram Business ID: ${pageDetails.instagram_business_account.id}\nPage ID: ${page.id}\nPage Name: ${pageDetails.name}`,
              );
            }
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
      }

      this.debugSteps.step7 = step7Passed ? 'PASS' : 'FAIL';
      this.debugSteps.step8 = step8Passed ? 'PASS' : 'FAIL';
      this.debugSteps.step9 = connectedCount > 0 ? 'PASS' : 'FAIL';

      if (connectedCount === 0) {
        throw new BadRequestException(
          'No pages with linked Instagram Business accounts were found',
        );
      }
    } finally {
      if (metaDebug) {
        this.logger.log(
          `==========================\nMETA DEBUG REPORT\n==========================\nStep 1\n${this.debugSteps.step1}\nStep 2\n${this.debugSteps.step2}\nStep 3\n${this.debugSteps.step3}\nStep 4\n${this.debugSteps.step4}\nStep 5\n${this.debugSteps.step5}\nStep 6\n${this.debugSteps.step6}\nStep 7\n${this.debugSteps.step7}\nStep 8\n${this.debugSteps.step8}\nStep 9\n${this.debugSteps.step9}`,
        );
      }
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
