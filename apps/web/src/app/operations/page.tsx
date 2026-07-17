"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Database,
  RefreshCw,
  Server,
  Layers,
  Webhook,
  Key,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  FileText,
  UserCheck,
} from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import {
  PageHeader,
  Section,
  MetricCard,
  InfoCard,
  StatusBadge,
  EmptyState,
  LoadingSkeleton,
} from "../../components/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// DTO interfaces matching backend structures
interface WebhookHealth {
  status: "Healthy" | "Offline";
  verificationStatus: string;
  subscriptionStatus: string;
  lastWebhookReceived: string | null;
  failures: number;
  invalidSignatures: number;
  rejectedPayloads: number;
  duplicatePayloads: number;
}

interface SystemHealthData {
  backend: {
    status: string;
    version: string;
    environment: string;
    uptime: number;
    memoryUsage: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    nodeVersion: string;
    cpuUsage?: {
      user: number;
      system: number;
    };
  };
  database: {
    status: "Healthy" | "Degraded" | "Offline";
    latencyMs: number;
    connectionStatus: string;
    migrationStatus: string;
  };
  redis: {
    status: "Healthy" | "Offline";
    latencyMs: number;
    connected: boolean;
    version: string;
    queueConnectivity: "Healthy" | "Offline";
  };
  bullmq: {
    status: "Healthy" | "Offline";
    queueConnection: string;
    workerConnection: string;
    delayedJobs: number;
    waitingJobs: number;
    failedJobs: number;
    completedJobsToday: number;
  };
  meta: {
    status: "Healthy" | "Degraded" | "Offline";
    apiHealth: string;
  };
  webhook: WebhookHealth;
  uptime: number;
  version: string;
  timestamp: string;
}

interface AccountHealthData {
  id: string;
  instagramName: string;
  instagramBusinessId: string;
  facebookPage: string;
  connectionStatus: "Healthy" | "Degraded" | "Disconnected";
  tokenStatus: "Valid" | "Expired" | "Missing";
  tokenExpiry: string | null;
  permissions: {
    hasAllRequired: boolean;
    scopes: Record<string, boolean>;
  } | null;
  webhookStatus: "Healthy" | "Offline";
  lastWebhookReceived: string | null;
  lastAssetSync: string | null;
  assetCount: number;
  automationCount: number;
  executionCountToday: number;
  lastSuccessfulExecution: string | null;
  lastFailedExecution: string | null;
  tokenHealth: {
    encryptedTokenExists: boolean;
    tokenValid: boolean;
    tokenExpiry: string | null;
    daysRemaining: number;
    reconnectRequired: boolean;
    tokenLastRefreshed: string;
  };
  assetHealth: {
    posts: number;
    reels: number;
    stories: number;
    lastSync: string | null;
    lastSyncDurationMs: number;
    syncFailures: number;
    currentSyncStatus: string;
  };
  automationHealth: {
    enabled: number;
    disabled: number;
    currentlyRunning: number;
    failedToday: number;
    avgRuntimeMs: number;
    mostActive: string;
  };
  executionHealth: {
    executionsToday: number;
    successful: number;
    failed: number;
    waiting: number;
    running: number;
    cancelled: number;
    avgDurationMs: number;
    longestDurationMs: number;
    lastExecution: string | null;
  };
}

interface OperationalEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  accountId?: string;
}

interface OperationalError {
  id: string;
  message: string;
  stackSummary: string;
  affectedAutomation: string;
  affectedAccount: string;
  timestamp: string;
  retryAvailable: boolean;
}

export default function OperationalControlCenterPage() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "accounts" | "pipelines" | "events" | "errors"
  >("overview");

  // React Query Fetchers with Polling every 45 seconds
  const pollingInterval = 45000;

  const {
    data: systemHealth,
    isLoading: systemLoading,
    isRefetching: systemRefetching,
    error: systemError,
    refetch: refetchSystem,
  } = useQuery<SystemHealthData>({
    queryKey: ["operations-system"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/operations/system`);
      if (!response.ok) throw new Error("Failed to load SRE health state.");
      return response.json();
    },
    refetchInterval: pollingInterval,
  });

  const {
    data: accountsHealth = [],
    isLoading: accountsLoading,
    error: accountsError,
    refetch: refetchAccounts,
  } = useQuery<AccountHealthData[]>({
    queryKey: ["operations-accounts"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/operations/accounts`);
      if (!response.ok)
        throw new Error("Failed to load connected account profiles.");
      return response.json();
    },
    refetchInterval: pollingInterval,
  });

  const {
    data: recentEvents = [],
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = useQuery<OperationalEvent[]>({
    queryKey: ["operations-events"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/operations/events`);
      if (!response.ok) throw new Error("Failed to clear timeline events.");
      return response.json();
    },
    refetchInterval: pollingInterval,
  });

  const {
    data: latestErrors = [],
    isLoading: errorsLoading,
    refetch: refetchErrors,
  } = useQuery<OperationalError[]>({
    queryKey: ["operations-errors"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/operations/errors`);
      if (!response.ok) throw new Error("Could not extract system logs.");
      return response.json();
    },
    refetchInterval: pollingInterval,
  });

  const triggerGlobalRefresh = () => {
    refetchSystem();
    refetchAccounts();
    refetchEvents();
    refetchErrors();
  };

  const getSystemBanner = () => {
    if (systemLoading) return null;
    if (systemError) {
      return (
        <div
          style={{
            padding: "12px 16px",
            background: "var(--danger-bg)",
            color: "var(--danger)",
            border: "1px solid rgba(220, 38, 38, 0.2)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            marginBottom: "20px",
          }}
        >
          <AlertCircle size={16} />
          <strong>System Degraded:</strong> Operations control service is
          unreachable. Verify API configurations.
        </div>
      );
    }

    const dbHealthy = systemHealth?.database.status === "Healthy";
    const redisHealthy = systemHealth?.redis.status === "Healthy";
    const queueHealthy = systemHealth?.bullmq.status === "Healthy";

    if (!dbHealthy || !redisHealthy || !queueHealthy) {
      return (
        <div
          style={{
            padding: "12px 16px",
            background: "var(--warning-bg)",
            color: "var(--warning)",
            border: "1px solid rgba(217, 119, 6, 0.2)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            marginBottom: "20px",
          }}
        >
          <AlertCircle size={16} />
          <strong>Warning:</strong> Core platform resources (DB, Cache, or Queue
          manager) are degraded or offline. Check details below.
        </div>
      );
    }

    return (
      <div
        style={{
          padding: "12px 16px",
          background: "var(--success-bg)",
          color: "var(--success)",
          border: "1px solid rgba(22, 163, 74, 0.2)",
          borderRadius: "var(--radius-md)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "13px",
          marginBottom: "20px",
        }}
      >
        <CheckCircle size={16} />
        All infrastructure nodes (Database, Cache cluster, Webhook endpoints,
        Meta API proxy) are fully operational and processing tasks.
      </div>
    );
  };

  return (
    <AppShell>
      <PageHeader
        title="Operational Control Center"
        subtitle="Live site reliability and telemetry diagnostics for the Instagram automation engine pipeline."
        icon={<Activity size={22} />}
        actions={
          <button
            onClick={triggerGlobalRefresh}
            disabled={systemLoading || systemRefetching}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-secondary)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RefreshCw
              size={13}
              className={systemRefetching ? "animate-spin" : ""}
            />
            Refetch Telemetry
          </button>
        }
      />

      {getSystemBanner()}

      {/* Navigation Tab list */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "24px",
          overflowX: "auto",
          paddingBottom: "2px",
        }}
      >
        {(
          ["overview", "accounts", "pipelines", "events", "errors"] as const
        ).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 16px",
              background: "none",
              border: "none",
              borderBottom:
                activeTab === tab
                  ? "2px solid var(--primary)"
                  : "2px solid transparent",
              color:
                activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
              fontWeight: activeTab === tab ? 650 : 500,
              fontSize: "13px",
              cursor: "pointer",
              textTransform: "capitalize",
              outline: "none",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {systemLoading ? (
        <LoadingSkeleton variant="table" count={5} />
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && systemHealth && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "24px" }}
            >
              {/* Telemetry Cards Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "16px",
                }}
              >
                <MetricCard
                  title="Database Performance"
                  value={`${systemHealth.database.latencyMs}ms`}
                  subtitle={`Prisma Connection: ${systemHealth.database.connectionStatus}`}
                  icon={<Database size={16} />}
                />
                <MetricCard
                  title="Cache Pool Latency"
                  value={`${systemHealth.redis.latencyMs}ms`}
                  subtitle={`Connection status: ${systemHealth.redis.connected ? "Active" : "Closed"}`}
                  icon={<Server size={16} />}
                />
                <MetricCard
                  title="Active Queue Jobs"
                  value={
                    systemHealth.bullmq.waitingJobs +
                    systemHealth.bullmq.delayedJobs
                  }
                  subtitle={`${systemHealth.bullmq.waitingJobs} waiting / ${systemHealth.bullmq.delayedJobs} delayed`}
                  icon={<Layers size={16} />}
                />
                <MetricCard
                  title="Uptime"
                  value={`${Math.floor(systemHealth.backend.uptime / 3600)} hrs`}
                  subtitle={`Node: ${systemHealth.backend.nodeVersion}`}
                  icon={<Clock size={16} />}
                />
              </div>

              {/* Infrastructure Section cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: "24px",
                }}
              >
                <Section
                  title="Database Engine"
                  description="Sourcing credentials and connection health of migration schemas."
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      fontSize: "13px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        borderBottom: "1px solid var(--divider)",
                        paddingBottom: "8px",
                      }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>
                        Engine Connection
                      </span>
                      <StatusBadge status={systemHealth.database.status} />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        borderBottom: "1px solid var(--divider)",
                        paddingBottom: "8px",
                      }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>
                        Verify Roundtrip Latency
                      </span>
                      <span
                        style={{
                          color: "var(--text-primary)",
                          fontWeight: 600,
                        }}
                      >
                        {systemHealth.database.latencyMs} ms
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        borderBottom: "1px solid var(--divider)",
                        paddingBottom: "8px",
                      }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>
                        Migration Status
                      </span>
                      <span style={{ color: "var(--text-primary)" }}>
                        {systemHealth.database.migrationStatus}
                      </span>
                    </div>
                  </div>
                </Section>

                <Section
                  title="Redis Cache Pool"
                  description="Used for rate-limiting, processed event idempotency checks, and distributed locks."
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      fontSize: "13px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        borderBottom: "1px solid var(--divider)",
                        paddingBottom: "8px",
                      }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>
                        Cluster Node status
                      </span>
                      <StatusBadge status={systemHealth.redis.status} />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        borderBottom: "1px solid var(--divider)",
                        paddingBottom: "8px",
                      }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>
                        Redis Version
                      </span>
                      <span
                        style={{
                          color: "var(--text-primary)",
                          fontWeight: 600,
                        }}
                      >
                        {systemHealth.redis.version}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        borderBottom: "1px solid var(--divider)",
                        paddingBottom: "8px",
                      }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>
                        Queue connectivity
                      </span>
                      <span style={{ color: "var(--text-primary)" }}>
                        {systemHealth.redis.queueConnectivity}
                      </span>
                    </div>
                  </div>
                </Section>

                <Section
                  title="Meta API Gateway"
                  description="Direct link status check to Meta Graph APIs."
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      fontSize: "13px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        borderBottom: "1px solid var(--divider)",
                        paddingBottom: "8px",
                      }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>
                        Graph Reachability
                      </span>
                      <StatusBadge status={systemHealth.meta.status} />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        borderBottom: "1px solid var(--divider)",
                        paddingBottom: "8px",
                      }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>
                        Endpoint Target API
                      </span>
                      <span style={{ color: "var(--text-primary)" }}>
                        {systemHealth.meta.apiHealth}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        borderBottom: "1px solid var(--divider)",
                        paddingBottom: "8px",
                      }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>
                        Verify Secret status
                      </span>
                      <span style={{ color: "var(--text-primary)" }}>
                        {process.env.META_VERIFY_TOKEN ? "Loaded" : "Not Set"}
                      </span>
                    </div>
                  </div>
                </Section>
              </div>

              {/* Webhook Metrics Section */}
              <Section
                title="Webhook Pipeline Health"
                description="Status and logs of events dispatched from the Meta webhook pipelines."
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "16px",
                  }}
                >
                  <InfoCard
                    title="Subscribed status"
                    value={systemHealth.webhook.subscriptionStatus}
                    status={
                      systemHealth.webhook.status === "Healthy"
                        ? "success"
                        : "danger"
                    }
                    statusLabel={systemHealth.webhook.status}
                  />
                  <InfoCard
                    title="Failures Detected"
                    value={systemHealth.webhook.failures}
                    status={
                      systemHealth.webhook.failures > 0 ? "danger" : "success"
                    }
                    statusLabel={
                      systemHealth.webhook.failures > 0 ? "Degraded" : "Nominal"
                    }
                  />
                  <InfoCard
                    title="Invalid Signatures"
                    value={systemHealth.webhook.invalidSignatures}
                    status={
                      systemHealth.webhook.invalidSignatures > 0
                        ? "warning"
                        : "success"
                    }
                    statusLabel={
                      systemHealth.webhook.invalidSignatures > 0
                        ? "Review Logs"
                        : "Passes Verification"
                    }
                  />
                  <InfoCard
                    title="Duplicate Events"
                    value={systemHealth.webhook.duplicatePayloads}
                    status="neutral"
                    statusLabel="Idempotent Events"
                  />
                </div>
              </Section>
            </div>
          )}

          {/* TAB 2: INSTAGRAM ACCOUNTS HEALTH */}
          {activeTab === "accounts" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "24px" }}
            >
              {accountsHealth.length === 0 ? (
                <EmptyState
                  title="No Accounts Synchronized"
                  description="Establish integration settings with at least one Instagram Professional Account to verify channel metrics."
                  icon={<UserCheck size={24} />}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                  }}
                >
                  {accountsHealth.map((acc) => (
                    <Section
                      key={acc.id}
                      title={`@${acc.instagramName}`}
                      description={`Business Profile Target ID: ${acc.instagramBusinessId}`}
                      extra={<StatusBadge status={acc.connectionStatus} />}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(280px, 1fr))",
                          gap: "20px",
                          marginTop: "12px",
                        }}
                      >
                        {/* Token Health Panel */}
                        <div
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-md)",
                            padding: "16px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--text-muted)",
                              fontWeight: 650,
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Key size={12} /> TOKEN HEALTH
                          </span>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                              fontSize: "13px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span style={{ color: "var(--text-muted)" }}>
                                Token State
                              </span>
                              <span
                                style={{
                                  color: acc.tokenHealth.tokenValid
                                    ? "var(--success)"
                                    : "var(--danger)",
                                  fontWeight: 600,
                                }}
                              >
                                {acc.tokenHealth.tokenValid
                                  ? "Valid"
                                  : "Expired / Invalid"}
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span style={{ color: "var(--text-muted)" }}>
                                Days Remaining
                              </span>
                              <span style={{ color: "var(--text-primary)" }}>
                                {acc.tokenHealth.daysRemaining} days
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span style={{ color: "var(--text-muted)" }}>
                                Last Refreshed
                              </span>
                              <span style={{ color: "var(--text-primary)" }}>
                                {new Date(
                                  acc.tokenHealth.tokenLastRefreshed,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Permissions Health Panel */}
                        <div
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-md)",
                            padding: "16px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--text-muted)",
                              fontWeight: 650,
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Shield size={12} /> META SCOPES PERMISSIONS
                          </span>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "6px",
                            }}
                          >
                            {acc.permissions ? (
                              Object.entries(acc.permissions.scopes).map(
                                ([scope, granted]) => (
                                  <span
                                    key={scope}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      fontSize: "11px",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      background: granted
                                        ? "var(--success-bg)"
                                        : "var(--danger-bg)",
                                      color: granted
                                        ? "var(--success)"
                                        : "var(--danger)",
                                      border: granted
                                        ? "1px solid rgba(22, 163, 74, 0.15)"
                                        : "1px solid rgba(220, 38, 38, 0.15)",
                                    }}
                                  >
                                    {scope}: {granted ? "Granted" : "Missing"}
                                  </span>
                                ),
                              )
                            ) : (
                              <span
                                style={{
                                  fontSize: "12px",
                                  color: "var(--text-muted)",
                                }}
                              >
                                No permission telemetry logged.
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Asset Library Stats */}
                        <div
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-md)",
                            padding: "16px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--text-muted)",
                              fontWeight: 650,
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <FileText size={12} /> ASSETS TELEMETRY
                          </span>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                              fontSize: "13px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span style={{ color: "var(--text-muted)" }}>
                                Reels / Posts / Stories
                              </span>
                              <span style={{ color: "var(--text-primary)" }}>
                                {acc.assetHealth.reels} Reels /{" "}
                                {acc.assetHealth.posts} Posts
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span style={{ color: "var(--text-muted)" }}>
                                Sync status
                              </span>
                              <span style={{ color: "var(--text-primary)" }}>
                                {acc.assetHealth.currentSyncStatus}
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span style={{ color: "var(--text-muted)" }}>
                                Last Synchronized
                              </span>
                              <span style={{ color: "var(--text-primary)" }}>
                                {acc.assetHealth.lastSync
                                  ? new Date(
                                    acc.assetHealth.lastSync,
                                  ).toLocaleTimeString()
                                  : "Never"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Section>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PIPELINE AND QUEUE HEALTH */}
          {activeTab === "pipelines" && systemHealth && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "24px" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "16px",
                }}
              >
                <MetricCard
                  title="BullMQ Waiting Jobs"
                  value={systemHealth.bullmq.waitingJobs}
                  subtitle="Ready to be picked up by automation workers."
                  icon={<Layers size={16} />}
                />
                <MetricCard
                  title="Delayed Run counts"
                  value={systemHealth.bullmq.delayedJobs}
                  subtitle="Awaiting lock releases or timing configurations."
                  icon={<Clock size={16} />}
                />
                <MetricCard
                  title="Failed Jobs"
                  value={systemHealth.bullmq.failedJobs}
                  subtitle="Review error center logs to resolve issues."
                  icon={<AlertCircle size={16} />}
                />
                <MetricCard
                  title="Completed Runs Today"
                  value={systemHealth.bullmq.completedJobsToday}
                  subtitle="Success executions committed to DB."
                  icon={<CheckCircle size={16} />}
                />
              </div>

              <Section
                title="Worker Processing Nodes"
                description="Diagnostics of concurrent worker groups executing jobs."
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    fontSize: "13px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderBottom: "1px solid var(--divider)",
                      paddingBottom: "8px",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>
                      Job Manager Connectivity
                    </span>
                    <span style={{ color: "var(--success)", fontWeight: 600 }}>
                      Active
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderBottom: "1px solid var(--divider)",
                      paddingBottom: "8px",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>
                      Active Worker status
                    </span>
                    <span style={{ color: "var(--success)" }}>
                      Healthy (Listening for jobs)
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      paddingBottom: "8px",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>
                      Target Queue Names
                    </span>
                    <span style={{ color: "var(--text-primary)" }}>
                      automation, automation-dlq
                    </span>
                  </div>
                </div>
              </Section>
            </div>
          )}

          {/* TAB 4: RECENT EVENTS EVENT STREAM */}
          {activeTab === "events" && (
            <Section
              title="Real-time Event Traces"
              description="Aggregated event stream of incoming webhooks, automation run bounds and outbound message deliveries."
            >
              {recentEvents.length === 0 ? (
                <EmptyState
                  title="No Events Discovered"
                  description="Real-time trigger logs will occupy this view as user communications occur."
                />
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "13px",
                      minWidth: "500px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          textAlign: "left",
                          borderBottom: "1px solid var(--border)",
                          color: "var(--text-muted)",
                        }}
                      >
                        <th style={{ padding: "10px 12px" }}>Time</th>
                        <th style={{ padding: "10px 12px" }}>Source Node</th>
                        <th style={{ padding: "10px 12px" }}>Run Details</th>
                        <th style={{ padding: "10px 12px" }}>Account</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentEvents.map((evt) => (
                        <tr
                          key={evt.id}
                          style={{ borderBottom: "1px solid var(--divider)" }}
                        >
                          <td
                            style={{
                              padding: "12px",
                              color: "var(--text-muted)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {new Date(evt.timestamp).toLocaleTimeString()}
                          </td>
                          <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                            <span
                              style={{
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: 600,
                                background:
                                  evt.type === "webhook_received"
                                    ? "#EFF6FF"
                                    : evt.type.includes("failed")
                                      ? "var(--danger-bg)"
                                      : "var(--success-bg)",
                                color:
                                  evt.type === "webhook_received"
                                    ? "#3B82F6"
                                    : evt.type.includes("failed")
                                      ? "var(--danger)"
                                      : "var(--success)",
                              }}
                            >
                              {evt.type.toUpperCase()}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              color: "var(--text-primary)",
                            }}
                          >
                            {evt.message}
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              color: "var(--text-muted)",
                            }}
                          >
                            {evt.accountId || "Global Pipeline"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          )}

          {/* TAB 5: SITE ERROR CENTER */}
          {activeTab === "errors" && (
            <Section
              title="Failed Executions Log"
              description="Review details of recent automation job exceptions and parsing errors here."
            >
              {latestErrors.length === 0 ? (
                <EmptyState
                  title="Zero Errors Logged"
                  description="Platform is operating clean with absolutely no recent system exceptions."
                  icon={<CheckCircle size={24} color="var(--success)" />}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  {latestErrors.map((error) => (
                    <div
                      key={error.id}
                      style={{
                        padding: "16px",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        background: "var(--surface-secondary)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "8px",
                        }}
                      >
                        <div>
                          <strong
                            style={{
                              fontSize: "14px",
                              color: "var(--danger)",
                              display: "block",
                            }}
                          >
                            {error.message}
                          </strong>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--text-muted)",
                            }}
                          >
                            Occurred:{" "}
                            {new Date(error.timestamp).toLocaleString()} |
                            Campaign: {error.affectedAutomation}
                          </span>
                        </div>
                        {error.retryAvailable && (
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "2px 6px",
                              background: "var(--warning-bg)",
                              color: "var(--warning)",
                              borderRadius: "4px",
                              fontWeight: 650,
                            }}
                          >
                            Job Retry Pending
                          </span>
                        )}
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          padding: "12px",
                          background: "#1E293B",
                          color: "#F8FAFC",
                          borderRadius: "4px",
                          fontFamily: "monospace",
                          fontSize: "11px",
                          overflowX: "auto",
                          maxHeight: "120px",
                        }}
                      >
                        {error.stackSummary}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}
        </>
      )}
    </AppShell>
  );
}
