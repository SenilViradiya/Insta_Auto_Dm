import { Injectable } from '@nestjs/common';

@Injectable()
export class AutomationConfig {
  get redisHost(): string {
    return process.env.REDIS_HOST ?? 'localhost';
  }

  get redisPort(): number {
    return parseInt(process.env.REDIS_PORT ?? '6379', 10);
  }

  get redisPassword(): string | undefined {
    return process.env.REDIS_PASSWORD || undefined;
  }

  get workerConcurrency(): number {
    const env = process.env.NODE_ENV ?? 'development';
    const defaultValue =
      env === 'production' ? '50' : env === 'staging' ? '20' : '5';
    return parseInt(process.env.AUTOMATION_CONCURRENCY ?? defaultValue, 10);
  }

  get retryAttempts(): number {
    return parseInt(process.env.AUTOMATION_RETRY_ATTEMPTS ?? '3', 10);
  }

  get retryBackoffDelayMs(): number {
    return parseInt(process.env.AUTOMATION_RETRY_BACKOFF_DELAY ?? '5000', 10);
  }

  get slowExecutionThresholdMs(): number {
    return parseInt(process.env.AUTOMATION_SLOW_THRESHOLD ?? '1000', 10);
  }

  get debugLogging(): boolean {
    return process.env.DEBUG_LOGGING === 'true';
  }
}
