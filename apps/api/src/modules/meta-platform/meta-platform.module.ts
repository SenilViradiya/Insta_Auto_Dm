import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { MetaPlatformConfig } from './config/meta-platform.config';
import { GraphClient } from './clients/graph.client';
import { TokenService } from './services/token.service';
import { PermissionService } from './services/permission.service';
import { SubscriptionService } from './services/subscription.service';
import { ProfileService } from './services/profile.service';
import { AssetService } from './services/asset.service';
import { MessagingService } from './services/messaging.service';

@Module({
  providers: [
    PrismaService,
    MetaPlatformConfig,
    GraphClient,
    TokenService,
    PermissionService,
    SubscriptionService,
    ProfileService,
    AssetService,
    MessagingService,
  ],
  exports: [
    MetaPlatformConfig,
    GraphClient,
    TokenService,
    PermissionService,
    SubscriptionService,
    ProfileService,
    AssetService,
    MessagingService,
  ],
})
export class MetaPlatformModule {}
