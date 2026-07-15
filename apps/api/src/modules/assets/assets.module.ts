import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AssetController } from './controllers/asset.controller';
import { AssetService } from './services/asset.service';
import { AssetRepository } from './repositories/asset.repository';
import { MetaAssetClient } from './clients/meta-asset.client';
import { MetaPlatformModule } from '../meta-platform/meta-platform.module';

@Module({
  imports: [MetaPlatformModule],
  controllers: [AssetController],
  providers: [PrismaService, AssetService, AssetRepository, MetaAssetClient],
  exports: [AssetService, AssetRepository],
})
export class AssetsModule {}
