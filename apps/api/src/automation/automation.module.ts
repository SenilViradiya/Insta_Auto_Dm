import { Module } from '@nestjs/common';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [AutomationController],
  providers: [AutomationService, PrismaService],
})
export class AutomationModule {}
