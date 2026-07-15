import { loadEnvFiles } from './config/env-validator';
loadEnvFiles();

import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { validateStartup } from './config/startup-validation';

async function bootstrap() {
  await validateStartup();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  app.useLogger(app.get(Logger));
  app.enableCors();
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
void bootstrap();
