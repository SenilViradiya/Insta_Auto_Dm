import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { LockService } from '../../automation/services/lock.service';
import { TokenService } from '../meta-platform/services/token.service';
import { PermissionService } from '../meta-platform/services/permission.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SystemHealthResponseDto } from './dto/system-health.dto';
import { AccountHealthResponseDto } from './dto/account-health.dto';

@Injectable()
export class OperationsService {
  private readonly logger = new Logger(OperationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: LockService,
    private readonly tokenService: TokenService,
    private readonly permissionService: PermissionService,
    @InjectQueue('automation') private readonly automationQueue: Queue,
    @Optional()
    @InjectQueue('automation-dlq')
    private readonly dlqQueue?: Queue,
  ) {}

  async getSystemHealth(): Promise<SystemHealthResponseDto> {
    const timestamp = new Date().toISOString();

    // 1. Database Health Check
    const dbStart = Date.now();
    let dbStatus: 'Healthy' | 'Degraded' | 'Offline' = 'Healthy';
    let dbLatencyMs = 0;
    let dbConnection = 'Disconnected';
    let dbMigrations = 'Unknown';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbStart;
      dbConnection = 'Connected';
      dbStatus = dbLatencyMs > 250 ? 'Degraded' : 'Healthy';

      // Basic check to see if migrations table exists
      const migrationCheck: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT tablename FROM pg_tables WHERE tablename = '_prisma_migrations'`,
      );
      if (migrationCheck.length > 0) {
        dbMigrations = 'Up to date';
      }
    } catch (err) {
      dbStatus = 'Offline';
      dbConnection = 'Error';
    }

    // 2. Redis Health Check
    const redisClient = this.lockService.getRedisClient();
    const redisStart = Date.now();
    let redisStatus: 'Healthy' | 'Offline' = 'Healthy';
    let redisLatencyMs = 0;
    let redisConnected = false;
    let redisVersion = 'Unknown';
    let queueConnectivity: 'Healthy' | 'Offline' = 'Offline';
    try {
      const pingRes = await redisClient.ping();
      redisLatencyMs = Date.now() - redisStart;
      redisConnected = pingRes === 'PONG';
      redisStatus = redisConnected ? 'Healthy' : 'Offline';

      const info = await redisClient.info();
      const versionMatch = info.match(/redis_version:([0-9.]+)/);
      if (versionMatch) redisVersion = versionMatch[1];

      if (this.automationQueue) {
        const queueClient = (this.automationQueue as any).client;
        if (queueClient) {
          await queueClient.ping();
          queueConnectivity = 'Healthy';
        }
      }
    } catch {
      redisStatus = 'Offline';
    }

    // 3. BullMQ Health Check
    let bullmqStatus: 'Healthy' | 'Offline' = 'Healthy';
    let delayedJobs = 0;
    let waitingJobs = 0;
    let failedJobs = 0;
    let completedJobsToday = 0;
    try {
      delayedJobs = await this.automationQueue.getJobCountByTypes('delayed');
      waitingJobs = await this.automationQueue.getJobCountByTypes('waiting');
      failedJobs = await this.automationQueue.getJobCountByTypes('failed');

      completedJobsToday = await this.prisma.automationExecution.count({
        where: {
          status: 'SUCCESS',
          startedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });
    } catch {
      bullmqStatus = 'Offline';
    }

    // 4. Meta Reachability Health
    let metaStatus: 'Healthy' | 'Degraded' | 'Offline' = 'Healthy';
    let metaApi = 'Reachability OK';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('https://graph.facebook.com/v17.0', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok || res.status === 400) {
        metaApi = 'Reachability OK';
      } else {
        metaApi = 'Degraded';
        metaStatus = 'Degraded';
      }
    } catch {
      metaApi = 'Offline';
      metaStatus = 'Offline';
    }

    // 5. Webhook Health details
    let lastWebhookReceived: string | null = null;
    let failuresVal = 0;
    let invalidSignaturesVal = 0;
    let rejectedPayloadsVal = 0;
    let duplicatePayloadsVal = 0;
    try {
      lastWebhookReceived =
        (await redisClient.get('operations:webhook:last_received')) || null;
      failuresVal =
        Number(await redisClient.get('operations:webhook:failures')) || 0;
      invalidSignaturesVal =
        Number(
          await redisClient.get('operations:webhook:invalid_signatures'),
        ) || 0;
      rejectedPayloadsVal =
        Number(await redisClient.get('operations:webhook:rejected_payloads')) ||
        0;
      duplicatePayloadsVal =
        Number(
          await redisClient.get('operations:webhook:duplicate_payloads'),
        ) || 0;
    } catch {}

    const webhookStatus = lastWebhookReceived ? 'Healthy' : 'Offline';
    const verificationStatus = process.env.META_VERIFY_TOKEN
      ? 'Verified'
      : 'Unconfigured';
    const subscriptionStatus = lastWebhookReceived ? 'Subscribed' : 'Pending';

    // 6. Backend details
    const procUptime = Math.floor(process.uptime());
    const memUsage = process.memoryUsage();
    const cpu = process.cpuUsage();

    return {
      backend: {
        status: 'Healthy',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: procUptime,
        memoryUsage: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
        },
        nodeVersion: process.version,
        cpuUsage: {
          user: cpu.user,
          system: cpu.system,
        },
      },
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        connectionStatus: dbConnection,
        migrationStatus: dbMigrations,
      },
      redis: {
        status: redisStatus,
        latencyMs: redisLatencyMs,
        connected: redisConnected,
        version: redisVersion,
        queueConnectivity,
      },
      bullmq: {
        status: bullmqStatus,
        queueConnection: redisConnected ? 'Connected' : 'Disconnected',
        workerConnection: redisConnected ? 'Connected' : 'Disconnected',
        delayedJobs,
        waitingJobs,
        failedJobs,
        completedJobsToday,
      },
      meta: {
        status: metaStatus,
        apiHealth: metaApi,
      },
      webhook: {
        status: webhookStatus,
        verificationStatus,
        subscriptionStatus,
        lastWebhookReceived,
        failures: failuresVal,
        invalidSignatures: invalidSignaturesVal,
        rejectedPayloads: rejectedPayloadsVal,
        duplicatePayloads: duplicatePayloadsVal,
      },
      uptime: procUptime,
      version: process.env.npm_package_version || '1.0.0',
      timestamp,
    };
  }

  async getAccountsHealth(): Promise<AccountHealthResponseDto[]> {
    const redisClient = this.lockService.getRedisClient();
    const accounts = await this.prisma.instagramAccount.findMany({
      include: {
        assets: true,
        profile: true,
      },
    });

    const results: AccountHealthResponseDto[] = [];
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

    for (const acc of accounts) {
      // 1. Fetch live metrics counts
      const assetCount = acc.assets.length;
      const automationCount = await this.prisma.automation.count({
        where: { instagramAccountId: acc.id },
      });
      const executionCountToday = await this.prisma.automationExecution.count({
        where: {
          automation: { instagramAccountId: acc.id },
          startedAt: { gte: todayStart },
        },
      });

      // Executions breakdowns
      const successes = await this.prisma.automationExecution.findMany({
        where: {
          automation: { instagramAccountId: acc.id },
          status: 'SUCCESS',
        },
        select: { durationMs: true, startedAt: true },
      });
      const failures = await this.prisma.automationExecution.findMany({
        where: {
          automation: { instagramAccountId: acc.id },
          status: 'FAILED',
        },
        select: { startedAt: true },
      });

      const lastSuccess =
        successes.length > 0
          ? successes[successes.length - 1].startedAt.toISOString()
          : null;
      const lastFailure =
        failures.length > 0
          ? failures[failures.length - 1].startedAt.toISOString()
          : null;

      const totalSuccessDuration = successes.reduce(
        (accS, curr) => accS + (curr.durationMs || 0),
        0,
      );
      const avgDuration =
        successes.length > 0
          ? Math.round(totalSuccessDuration / successes.length)
          : 0;

      const allExecutions = await this.prisma.automationExecution.findMany({
        where: { automation: { instagramAccountId: acc.id } },
        select: { durationMs: true, startedAt: true, status: true },
      });

      const maxDuration = allExecutions.reduce(
        (max, curr) => Math.max(max, curr.durationMs || 0),
        0,
      );
      const lastExecTime =
        allExecutions.length > 0
          ? allExecutions[allExecutions.length - 1].startedAt.toISOString()
          : null;

      // 2. Validate token and check expiry details
      let tokenValid = true;
      let tokenExpiryStr: string | null = null;
      let daysRemaining = 999;
      let reconnectRequired = false;

      if (acc.tokenExpiresAt) {
        tokenExpiryStr = acc.tokenExpiresAt.toISOString();
        const diffMs = acc.tokenExpiresAt.getTime() - Date.now();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        tokenValid = diffMs > 0;
        reconnectRequired = !tokenValid;
      }

      // 3. Webhook statistics
      const lastWebhook =
        (await redisClient.get(`operations:webhook:last_received:${acc.id}`)) ||
        null;

      // 4. Permissions validation
      let permissionsResult: {
        hasAllRequired: boolean;
        scopes: Record<string, boolean>;
      } | null = null;

      try {
        const decryptedToken = await this.tokenService.getToken(acc.id);
        if (decryptedToken) {
          const val =
            await this.permissionService.validatePermissions(decryptedToken);
          permissionsResult = {
            hasAllRequired: val.hasAllRequired,
            scopes: val.scopes,
          };
        }
      } catch (err) {
        this.logger.warn(
          `Could not trace Meta permissions scope: ${(err as Error).message}`,
        );
      }

      // Sync status
      const syncDurationStr = await redisClient.get(
        `operations:sync:duration:${acc.id}`,
      );
      const syncDurationVal = syncDurationStr
        ? parseInt(syncDurationStr, 10)
        : 0;
      const syncFailedStr = await redisClient.get(
        `operations:sync:failures:${acc.id}`,
      );
      const syncFailuresCount = syncFailedStr ? parseInt(syncFailedStr, 10) : 0;
      const currentSyncState =
        (await redisClient.get(`operations:sync:status:${acc.id}`)) || 'idle';

      // Automation health counts
      const enabledCount = await this.prisma.automation.count({
        where: { instagramAccountId: acc.id, enabled: true },
      });
      const disabledCount = await this.prisma.automation.count({
        where: { instagramAccountId: acc.id, enabled: false },
      });
      const currentlyRunning = allExecutions.filter(
        (e) => e.status === 'RUNNING',
      ).length;
      const failedToday = allExecutions.filter(
        (e) => e.status === 'FAILED' && new Date(e.startedAt) >= todayStart,
      ).length;

      // Most active Campaign name
      const autoRuns: Record<string, { runs: number; name: string }> = {};
      const execWithAuto = await this.prisma.automationExecution.findMany({
        where: { automation: { instagramAccountId: acc.id } },
        include: { automation: true },
      });
      execWithAuto.forEach((e) => {
        const id = e.automationId;
        const name = e.automation.name;
        if (!autoRuns[id]) autoRuns[id] = { runs: 0, name };
        autoRuns[id].runs++;
      });
      let mostActiveStr = 'None';
      let maxRuns = 0;
      Object.values(autoRuns).forEach((row) => {
        if (row.runs > maxRuns) {
          maxRuns = row.runs;
          mostActiveStr = row.name;
        }
      });

      // Queue detailed jobs
      let dlqCount = 0;
      if (this.dlqQueue) {
        try {
          dlqCount = await this.dlqQueue.getJobCountByTypes(
            'waiting',
            'active',
            'delayed',
            'failed',
          );
        } catch {}
      }

      results.push({
        id: acc.id,
        instagramName: acc.pageName || 'Unknown Instagram User',
        instagramBusinessId: acc.instagramUserId,
        facebookPage: acc.pageName || 'Unknown Page',
        connectionStatus: tokenValid
          ? permissionsResult?.hasAllRequired
            ? 'Healthy'
            : 'Degraded'
          : 'Disconnected',
        tokenStatus: acc.accessTokenEncrypted
          ? tokenValid
            ? 'Valid'
            : 'Expired'
          : 'Missing',
        tokenExpiry: tokenExpiryStr,
        permissions: permissionsResult,
        webhookStatus: lastWebhook ? 'Healthy' : 'Offline',
        lastWebhookReceived: lastWebhook,
        lastAssetSync: acc.profile?.lastSyncedAt?.toISOString() || null,
        assetCount,
        automationCount,
        executionCountToday,
        lastSuccessfulExecution: lastSuccess,
        lastFailedExecution: lastFailure,

        // Breakdowns
        tokenHealth: {
          encryptedTokenExists: !!acc.accessTokenEncrypted,
          tokenValid,
          tokenExpiry: tokenExpiryStr,
          daysRemaining,
          reconnectRequired,
          tokenLastRefreshed: acc.updatedAt.toISOString(),
        },
        assetHealth: {
          posts: acc.assets.filter((accAsset) => accAsset.assetType === 'POST')
            .length,
          reels: acc.assets.filter((accAsset) => accAsset.assetType === 'REEL')
            .length,
          stories: acc.assets.filter(
            (accAsset) => (accAsset.assetType as string) === 'STORY',
          ).length,
          lastSync: acc.profile?.lastSyncedAt?.toISOString() || null,
          lastSyncDurationMs: syncDurationVal,
          syncFailures: syncFailuresCount,
          currentSyncStatus: currentSyncState,
        },
        automationHealth: {
          enabled: enabledCount,
          disabled: disabledCount,
          currentlyRunning,
          failedToday,
          avgRuntimeMs: avgDuration,
          mostActive: mostActiveStr,
        },
        executionHealth: {
          executionsToday: executionCountToday,
          successful: allExecutions.filter(
            (e) =>
              e.status === 'SUCCESS' && new Date(e.startedAt) >= todayStart,
          ).length,
          failed: failedToday,
          waiting: allExecutions.filter(
            (e) =>
              e.status === 'WAITING' && new Date(e.startedAt) >= todayStart,
          ).length,
          running: currentlyRunning,
          cancelled: allExecutions.filter(
            (e) =>
              e.status === 'CANCELLED' && new Date(e.startedAt) >= todayStart,
          ).length,
          avgDurationMs: avgDuration,
          longestDurationMs: maxDuration,
          lastExecution: lastExecTime,
        },
      });
    }

    return results;
  }

  async getRecentEvents(): Promise<any[]> {
    const rawEvents: any[] = [];

    // 1. Webhook checkins (ProcessedEvents)
    const procEvents = await this.prisma.processedEvent.findMany({
      take: 20,
      orderBy: { processedAt: 'desc' },
    });
    procEvents.forEach((p) => {
      rawEvents.push({
        id: p.id,
        type: 'webhook_received',
        message: `Webhook message processed under Event ID: ${p.eventId}`,
        timestamp: p.processedAt.toISOString(),
        accountId: p.instagramAccountId,
      });
    });

    // 2. Executions checkpoints (AutomationExecution)
    const execs = await this.prisma.automationExecution.findMany({
      take: 20,
      orderBy: { startedAt: 'desc' },
      include: { automation: true },
    });
    execs.forEach((e) => {
      rawEvents.push({
        id: e.id + '_start',
        type: 'automation_started',
        message: `Workflow "${e.automation.name}" execution started. Channel: ${e.automation.triggerType || 'DIRECT'}`,
        timestamp: e.startedAt.toISOString(),
        accountId: e.automation.instagramAccountId,
      });
      if (e.status === 'SUCCESS' && e.completedAt) {
        rawEvents.push({
          id: e.id + '_success',
          type: 'automation_completed',
          message: `Workflow "${e.automation.name}" completed successfully (Latency: ${e.durationMs}ms)`,
          timestamp: e.completedAt.toISOString(),
          accountId: e.automation.instagramAccountId,
        });
      } else if (e.status === 'FAILED' && e.completedAt) {
        rawEvents.push({
          id: e.id + '_fail',
          type: 'automation_failed',
          message: `Workflow "${e.automation.name}" execution failed. Verify logs for exact exception.`,
          timestamp: e.completedAt.toISOString(),
          accountId: e.automation.instagramAccountId,
        });
      }
    });

    // 3. Outbound Message metrics
    const outbounds = await this.prisma.outboundMessage.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
    outbounds.forEach((msg) => {
      const type = msg.automationExecutionId ? 'comment_replied' : 'dm_sent';
      const label =
        type === 'comment_replied'
          ? 'Reel comment reply dispatched'
          : 'DM outbound message sent';
      rawEvents.push({
        id: msg.id,
        type,
        message: `${label} to Instagram ID @${msg.recipientInstagramId}. Status: ${msg.status}`,
        timestamp: msg.createdAt.toISOString(),
        accountId: msg.instagramAccountId,
      });
    });

    // Order chronological descending
    const sorted = rawEvents.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    return sorted.slice(0, 30);
  }

  async getLatestErrors(): Promise<any[]> {
    const errorLogs = await this.prisma.automationLog.findMany({
      where: {
        OR: [{ level: 'ERROR' }, { level: 'error' }],
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: {
        execution: {
          include: {
            automation: true,
          },
        },
      },
    });

    return errorLogs.map((log) => {
      const stackStr =
        typeof log.metadata === 'object' && log.metadata
          ? (log.metadata as any).stack || JSON.stringify(log.metadata)
          : null;

      return {
        id: log.id,
        message: log.message,
        stackSummary: stackStr || 'No stack trace content recorded.',
        affectedAutomation:
          log.execution?.automation?.name || 'Inbound Pipeline',
        affectedAccount:
          log.execution?.automation?.instagramAccountId || 'Global Tenant',
        timestamp: log.createdAt.toISOString(),
        retryAvailable: log.execution?.status === 'FAILED',
      };
    });
  }
}
