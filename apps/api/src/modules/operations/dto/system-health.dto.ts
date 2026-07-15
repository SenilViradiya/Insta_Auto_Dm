export class BackendHealthDto {
  status!: string;
  version!: string;
  environment!: string;
  uptime!: number;
  memoryUsage!: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  nodeVersion!: string;
  cpuUsage?: {
    user: number;
    system: number;
  };
}

export class DatabaseHealthDto {
  status!: 'Healthy' | 'Degraded' | 'Offline';
  latencyMs!: number;
  connectionStatus!: string;
  migrationStatus!: string;
}

export class RedisHealthDto {
  status!: 'Healthy' | 'Offline';
  latencyMs!: number;
  connected!: boolean;
  version!: string;
  queueConnectivity!: 'Healthy' | 'Offline';
}

export class BullMQHealthDto {
  status!: 'Healthy' | 'Offline';
  queueConnection!: string;
  workerConnection!: string;
  delayedJobs!: number;
  waitingJobs!: number;
  failedJobs!: number;
  completedJobsToday!: number;
}

export class MetaHealthDto {
  status!: 'Healthy' | 'Degraded' | 'Offline';
  apiHealth!: string;
}

export class WebhookHealthDto {
  status!: 'Healthy' | 'Offline';
  verificationStatus!: string;
  subscriptionStatus!: string;
  lastWebhookReceived!: string | null;
  failures!: number;
  invalidSignatures!: number;
  rejectedPayloads!: number;
  duplicatePayloads!: number;
}

export class SystemHealthResponseDto {
  backend!: BackendHealthDto;
  database!: DatabaseHealthDto;
  redis!: RedisHealthDto;
  bullmq!: BullMQHealthDto;
  meta!: MetaHealthDto;
  webhook!: WebhookHealthDto;
  uptime!: number;
  version!: string;
  timestamp!: string;
}
