import { Module } from '@nestjs/common';
import { MetaController } from './meta.controller';
import { WebhookController } from './webhook.controller';
import { MetaService } from './meta.service';
import { PrismaService } from '../prisma.service';
import { AutomationModule } from '../automation/automation.module';

@Module({
  imports: [AutomationModule],
  controllers: [MetaController, WebhookController],
  providers: [MetaService, PrismaService],
})
export class MetaModule {}


