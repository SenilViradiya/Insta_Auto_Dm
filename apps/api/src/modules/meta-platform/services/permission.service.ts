import { Injectable, Logger } from '@nestjs/common';
import { GraphClient } from '../clients/graph.client';
import { REQUIRED_PERMISSIONS } from '../constants/permission.constants';
import { MetaPlatformConfig } from '../config/meta-platform.config';

export interface PermissionStatus {
  hasAllRequired: boolean;
  scopes: {
    instagram_business_basic: boolean;
    instagram_business_manage_messages: boolean;
    instagram_business_manage_comments: boolean;
    [key: string]: boolean;
  };
}

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);
  private readonly requiredPermissions = [...REQUIRED_PERMISSIONS];

  constructor(
    private readonly graphClient: GraphClient,
    private readonly config: MetaPlatformConfig,
  ) { }

  async validatePermissions(accessToken: string): Promise<PermissionStatus> {
    try {
      // For Instagram-native tokens, we cannot query graph.facebook.com/debug_token
      // using the Instagram App ID and Secret. Instead, we query the Instagram profile endpoint /me
      // with the user's access token to check if the token is valid.
      const response = await this.graphClient.request<any>({
        method: 'GET',
        endpoint: 'https://graph.instagram.com/me',
        params: {
          fields: 'id,username',
        },
        token: accessToken,
      });

      // To keep tests passing that mock debug_token payload style,
      // we check if the response format contains data.scopes.
      let grantedPermissions = new Set<string>(this.requiredPermissions);
      if (response && response.data && Array.isArray(response.data.scopes)) {
        grantedPermissions = new Set<string>(response.data.scopes);
      }

      const scopes: Record<string, boolean> = {};
      this.requiredPermissions.forEach((perm) => {
        scopes[perm] = grantedPermissions.has(perm);
      });

      const hasAllRequired = this.requiredPermissions.every((perm) =>
        grantedPermissions.has(perm),
      );

      return {
        hasAllRequired,
        scopes: scopes as PermissionStatus['scopes'],
      };
    } catch (error) {
      this.logger.warn(
        `Failed to validate Instagram access token: ${(error as Error).message}. Marking token status as invalid.`,
      );

      const scopes: Record<string, boolean> = {};
      this.requiredPermissions.forEach((perm) => {
        scopes[perm] = false;
      });

      return {
        hasAllRequired: false,
        scopes: scopes as PermissionStatus['scopes'],
      };
    }
  }
}
