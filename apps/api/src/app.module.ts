import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MetaModule } from './meta/meta.module';
import { AutomationModule } from './automation/automation.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { AssetsModule } from './modules/assets/assets.module';
import { MetaPlatformModule } from './modules/meta-platform/meta-platform.module';

import { getRedisConfig } from './config/redis.config';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                },
              }
            : undefined,
      },
    }),
    BullModule.forRoot({
      connection: getRedisConfig(),
    }),
    MetaPlatformModule,
    MetaModule,
    AutomationModule,
    MessagingModule,
    AssetsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
