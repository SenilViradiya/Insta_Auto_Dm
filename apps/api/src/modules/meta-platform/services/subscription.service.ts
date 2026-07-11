import { Injectable, Logger } from '@nestjs/common';
import { GraphClient } from '../clients/graph.client';
import { MetaPlatformConfig } from '../config/meta-platform.config';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly graphClient: GraphClient,
    private readonly config: MetaPlatformConfig,
  ) {}

  verifyWebhookChallenge(mode: string, token: string): boolean {
    const expectedToken = this.config.webhookVerifyToken || 'instagram_dm_webhook_verify_token';
    const match = mode === 'subscribe' && token === expectedToken;
    if (!match) {
      this.logger.warn(`Verification challenge failed. Mode: ${mode}, Token matched: ${token === expectedToken}`);
    }
    return match;
  }

  async checkSubscriptionHealth(): Promise<boolean> {
    try {
      const appId = this.config.appId;
      const appSecret = this.config.appSecret;
      if (!appId || !appSecret) {
        this.logger.warn('Meta App ID or App Secret is not configured. Skipping subscription check.');
        return false;
      }

      // App access token (app_id|app_secret) is used to inspect app subscription status
      const appToken = `${appId}|${appSecret}`;
      const response = await this.graphClient.request<{
        data: Array<{
          object: string;
          callback_url: string;
          fields: string[];
          active: boolean;
        }>;
      }>({
        method: 'GET',
        endpoint: `${appId}/subscriptions`,
        token: appToken,
      });

      const activeInstaSub = response?.data?.find(
        (sub) => sub.object === 'instagram' && sub.active
      );

      if (activeInstaSub) {
        this.logger.log('Instagram webhook subscriptions check: HEALTHY');
        return true;
      } else {
        this.logger.warn('Instagram webhook subscriptions check: UNHEALTHY / MISSING');
        return false;
      }
    } catch (error) {
      this.logger.error(`Error querying subscriptions health: ${(error as Error).message}`);
      return false;
    }
  }

  async repairWebhookSubscription(callbackUrl: string): Promise<boolean> {
    try {
      const appId = this.config.appId;
      const appSecret = this.config.appSecret;
      const appToken = `${appId}|${appSecret}`;

      this.logger.warn(`Attempting to repair webhook subscription for App: ${appId} pointing to: ${callbackUrl}`);

      await this.graphClient.request({
        method: 'POST',
        endpoint: `${appId}/subscriptions`,
        body: {
          object: 'instagram',
          callback_url: callbackUrl,
          fields: ['messages', 'messaging_postbacks', 'comments', 'mentions'],
          verify_token: this.config.webhookVerifyToken || 'instagram_dm_webhook_verify_token',
        },
        token: appToken,
      });

      this.logger.log('Successfully repaired Instagram webhook subscription.');
      return true;
    } catch (error) {
      this.logger.error(`Failed to repair/subscribe webhook: ${(error as Error).message}`);
      return false;
    }
  }
}
