import { Module } from '@nestjs/common';
import { MetaController } from './meta.controller';
import { WebhookController } from './webhook.controller';
import { MetaService } from './meta.service';
import { InstagramLoginService } from './instagram-login.service';
import { PrismaService } from '../prisma.service';
import { AutomationModule } from '../automation/automation.module';
import { MetaPlatformModule } from '../modules/meta-platform/meta-platform.module';

@Module({
  imports: [AutomationModule, MetaPlatformModule],
  controllers: [MetaController, WebhookController],
  providers: [MetaService, InstagramLoginService, PrismaService],
})
export class MetaModule { }
