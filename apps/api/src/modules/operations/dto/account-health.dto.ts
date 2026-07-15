export class TokenHealthDto {
  encryptedTokenExists!: boolean;
  tokenValid!: boolean;
  tokenExpiry!: string | null;
  daysRemaining!: number;
  reconnectRequired!: boolean;
  tokenLastRefreshed!: string;
}

export class AssetHealthDto {
  posts!: number;
  reels!: number;
  stories!: number;
  lastSync!: string | null;
  lastSyncDurationMs!: number;
  syncFailures!: number;
  currentSyncStatus!: string;
}

export class AutomationHealthDto {
  enabled!: number;
  disabled!: number;
  currentlyRunning!: number;
  failedToday!: number;
  avgRuntimeMs!: number;
  mostActive!: string;
}

export class ExecutionHealthDto {
  executionsToday!: number;
  successful!: number;
  failed!: number;
  waiting!: number;
  running!: number;
  cancelled!: number;
  avgDurationMs!: number;
  longestDurationMs!: number;
  lastExecution!: string | null;
}

export class QueueHealthDto {
  waitingJobs!: number;
  delayedJobs!: number;
  activeJobs!: number;
  completedToday!: number;
  failedToday!: number;
  retries!: number;
  dlqCount!: number;
  workerStatus!: string;
}

export class AccountHealthResponseDto {
  id!: string;
  instagramName!: string;
  instagramBusinessId!: string;
  facebookPage!: string;
  connectionStatus!: 'Healthy' | 'Degraded' | 'Disconnected';
  tokenStatus!: 'Valid' | 'Expired' | 'Missing';
  tokenExpiry!: string | null;
  permissions!: {
    hasAllRequired: boolean;
    scopes: Record<string, boolean>;
  } | null;
  webhookStatus!: 'Healthy' | 'Offline';
  lastWebhookReceived!: string | null;
  lastAssetSync!: string | null;
  assetCount!: number;
  automationCount!: number;
  executionCountToday!: number;
  lastSuccessfulExecution!: string | null;
  lastFailedExecution!: string | null;

  // Section Health breakdowns
  tokenHealth!: TokenHealthDto;
  assetHealth!: AssetHealthDto;
  automationHealth!: AutomationHealthDto;
  executionHealth!: ExecutionHealthDto;
}
