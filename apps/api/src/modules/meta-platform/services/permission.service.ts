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
      const response = await this.graphClient.request<{
        data: {
          scopes: string[];
          is_valid: boolean;
        };
      }>({
        method: 'GET',
        endpoint: 'debug_token',
        token: `${this.config.appId}|${this.config.appSecret}`,
        params: {
          input_token: accessToken,
        },
      });

      const grantedPermissions = new Set<string>(response?.data?.scopes || []);

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
      this.logger.error(
        `Failed to validate Meta permissions: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
