import { Injectable, Logger } from '@nestjs/common';
import { GraphClient } from '../clients/graph.client';

export interface PermissionStatus {
  hasAllRequired: boolean;
  scopes: {
    instagram_basic: boolean;
    instagram_manage_messages: boolean;
    pages_show_list: boolean;
    pages_read_engagement: boolean;
    business_management: boolean;
    [key: string]: boolean;
  };
}

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);
  private readonly requiredPermissions = [
    'instagram_basic',
    'instagram_manage_messages',
    'pages_show_list',
    'pages_read_engagement',
    'business_management',
  ];

  constructor(private readonly graphClient: GraphClient) {}

  async validatePermissions(accessToken: string): Promise<PermissionStatus> {
    try {
      const response = await this.graphClient.request<{
        data: Array<{ permission: string; status: 'granted' | 'declined' }>;
      }>({
        method: 'GET',
        endpoint: 'me/permissions',
        token: accessToken,
      });

      const grantedPermissions = new Set<string>();
      if (Array.isArray(response?.data)) {
        response.data.forEach((item) => {
          if (item.status === 'granted') {
            grantedPermissions.add(item.permission);
          }
        });
      }

      const scopes: Record<string, boolean> = {};
      this.requiredPermissions.forEach((perm) => {
        scopes[perm] = grantedPermissions.has(perm);
      });

      const hasAllRequired = this.requiredPermissions.every((perm) =>
        grantedPermissions.has(perm)
      );

      return {
        hasAllRequired,
        scopes: scopes as PermissionStatus['scopes'],
      };
    } catch (error) {
      this.logger.error(`Failed to validate Meta permissions: ${(error as Error).message}`);
      throw error;
    }
  }
}
