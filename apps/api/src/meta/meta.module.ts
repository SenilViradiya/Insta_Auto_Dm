import { Module } from '@nestjs/common';
import { MetaController } from './meta.controller';
import { MetaService } from './meta.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [MetaController],
  providers: [MetaService, PrismaService],
})
export class MetaModule {}
