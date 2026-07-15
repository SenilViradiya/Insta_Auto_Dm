import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaService } from '../../prisma.service';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';
import { AutomationModule } from '../../automation/automation.module';
import { MetaPlatformModule } from '../meta-platform/meta-platform.module';

@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: 'automation',
      },
      {
        name: 'automation-dlq',
      },
    ),
    AutomationModule,
    MetaPlatformModule,
  ],
  controllers: [OperationsController],
  providers: [OperationsService, PrismaService],
  exports: [OperationsService],
})
export class OperationsModule {}
