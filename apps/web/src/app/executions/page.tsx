"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Copy,
  Database,
} from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import { EmptyState, LoadingSkeleton } from "../../components/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface InstagramAccount {
  id: string;
  instagramUserId: string;
  pageId: string;
  pageName: string;
  connectedAt: string;
}

interface Automation {
  id: string;
  name: string;
  triggerType: string;
}

interface ExecutionLog {
  id: string;
  level: string;
  message: string;
  metadata: any;
  createdAt: string;
}

interface Execution {
  id: string;
  automationId: string;
  eventId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  automation?: Automation;
}

export default function ExecutionsPage() {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  // States for search and filter controls
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [automationFilter, setAutomationFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail Drawer state
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(
    null,
  );
  const [drawerTab, setDrawerTab] = useState<
    "details" | "logs" | "payload" | "retries"
  >("details");

  // Fetch connection accounts
  const { data: statusData, error: accountsError } = useQuery({
    queryKey: ["meta-status"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/meta/status`);
      if (!response.ok) throw new Error("Failed to fetch connection status");
      return response.json() as Promise<{ accounts: InstagramAccount[] }>;
    },
  });

  // Sync selected account state from local storage or pick first
  useEffect(() => {
    if (statusData?.accounts && statusData.accounts.length > 0) {
      const saved = localStorage.getItem("selected_instagram_account_id");
      const exactMatch = statusData.accounts.find((acc) => acc.id === saved);
      if (saved && exactMatch) {
        setSelectedAccountId(saved);
        return;
      }
      const firstId = statusData.accounts[0].id;
      setSelectedAccountId(firstId);
      localStorage.setItem("selected_instagram_account_id", firstId);
    } else {
      setSelectedAccountId(null);
    }
  }, [statusData]);

  const activeAccount = statusData?.accounts?.find(
    (a) => a.id === selectedAccountId,
  );

  const handleAccountChange = (val: string) => {
    setSelectedAccountId(val);
    localStorage.setItem("selected_instagram_account_id", val);
  };

  // Fetch automations list for dropdown filter options
  const { data: automationsList = [] } = useQuery({
    queryKey: ["automations-dropdown", selectedAccountId],
    queryFn: async () => {
      if (!selectedAccountId) return [];
      const response = await fetch(`${API_URL}/automations`, {
        headers: { "x-instagram-account-id": selectedAccountId },
      });
      if (!response.ok) return [];
      const json = await response.json();
      return Array.isArray(json.items) ? (json.items as Automation[]) : [];
    },
    enabled: !!selectedAccountId,
  });

  // Fetch Executions Query
  const {
    data: executionsResponse,
    isLoading: executionsLoading,
    error: executionsError,
    refetch,
  } = useQuery({
    queryKey: [
      "executions",
      selectedAccountId,
      statusFilter,
      automationFilter,
      currentPage,
      pageSize,
    ],
    queryFn: async () => {
      if (!selectedAccountId) return { items: [], total: 0 };
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (automationFilter !== "ALL")
        params.append("automationId", automationFilter);
      params.append("page", String(currentPage));
      params.append("limit", String(pageSize));

      const response = await fetch(
        `${API_URL}/executions?${params.toString()}`,
      );
      if (!response.ok) throw new Error("Failed to fetch executions data");
      return response.json() as Promise<{ items: Execution[]; total: number }>;
    },
    enabled: !!selectedAccountId,
  });

  // Fetch the selected execution details + logs
  const { data: selectedExecutionLogs = [], isLoading: logsLoading } = useQuery(
    {
      queryKey: ["execution-logs", selectedExecutionId],
      queryFn: async () => {
        if (!selectedExecutionId) return [];

        const response = await fetch(
          `${API_URL}/executions/${selectedExecutionId}/logs`,
        );
        if (!response.ok) return [];
        return response.json() as Promise<ExecutionLog[]>;
      },
      enabled: !!selectedExecutionId,
    },
  );

  // Fetch the selected execution details
  const { data: selectedExecution, isLoading: detailLoading } = useQuery({
    queryKey: ["execution-details", selectedExecutionId],
    queryFn: async () => {
      if (!selectedExecutionId) return null;
      const response = await fetch(
        `${API_URL}/executions/${selectedExecutionId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch execution details");
      return response.json() as Promise<Execution>;
    },
    enabled: !!selectedExecutionId,
  });

  // process executions with Client-side sorting and search
  const renderedExecutions = React.useMemo(() => {
    const list = [...(executionsResponse?.items || [])];

    // Apply Client side filters for search queries
    let finalFiltered = list;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      finalFiltered = finalFiltered.filter(
        (ex) =>
          ex.id.toLowerCase().includes(q) ||
          ex.eventId.toLowerCase().includes(q) ||
          (ex.automation?.name || "Untitled Flow").toLowerCase().includes(q),
      );
    }

    // Apply date filter
    if (dateFilter !== "ALL") {
      const now = new Date();
      finalFiltered = finalFiltered.filter((ex) => {
        const d = new Date(ex.startedAt);
        const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
        if (dateFilter === "TODAY") return diffHours <= 24;
        if (dateFilter === "YESTERDAY")
          return diffHours > 24 && diffHours <= 48;
        if (dateFilter === "WEEK") return diffHours <= 24 * 7;
        return true;
      });
    }

    // Sort by startedAt desc
    finalFiltered.sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );

    return finalFiltered;
  }, [executionsResponse, searchQuery, dateFilter]);

  // Handle clean badge display
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 8px",
              borderRadius: "12px",
              background: "var(--success-bg)",
              color: "var(--success)",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={12} />
            Success
          </span>
        );
      case "FAILED":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 8px",
              borderRadius: "12px",
              background: "var(--danger-bg)",
              color: "var(--danger)",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            <XCircle size={12} />
            Failed
          </span>
        );
      case "WAITING":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 8px",
              borderRadius: "12px",
              background: "var(--warning-bg)",
              color: "var(--warning)",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            <Clock size={12} />
            Waiting
          </span>
        );
      case "RUNNING":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 8px",
              borderRadius: "12px",
              background: "#EFF6FF",
              color: "#3B82F6",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#3B82F6",
                animation: "pulse 1.5s infinite",
              }}
            />
            Running
          </span>
        );
      default:
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 8px",
              borderRadius: "12px",
              background: "var(--divider)",
              color: "var(--text-muted)",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            <Clock size={12} />
            Queued
          </span>
        );
    }
  };

  // Timeline Event List Builder using database logs
  const getTimelineSteps = (exec: any, logs: any[]) => {
    const steps: {
      name: string;
      status: "success" | "running" | "waiting" | "failed" | "skipped";
      detail?: string;
    }[] = [];

    // Step 1: Webhook Incoming Trigger
    const typeLabel =
      exec.automation?.triggerType === "REEL_COMMENT"
        ? "Comment Received on Reel"
        : exec.automation?.triggerType === "POST_COMMENT"
          ? "Comment Received on Post"
          : exec.automation?.triggerType === "DIRECT_MESSAGE"
            ? "Direct Message Received"
            : exec.automation?.triggerType === "STORY_REPLY"
              ? "Instagram Story Reply Received"
              : "Webhook Incoming Trigger";
    steps.push({
      name: typeLabel,
      status: "success",
      detail: `Event ID: ${exec.eventId}`,
    });

    // Step 2...N: Map active logs
    if (logs && logs.length > 0) {
      logs.forEach((log) => {
        let status: "success" | "failed" | "running" | "waiting" = "success";
        if (log.level === "ERROR" || log.level === "FATAL") status = "failed";
        if (log.level === "WARN") status = "waiting";

        steps.push({
          name: log.message,
          status,
          detail: log.createdAt
            ? new Date(log.createdAt).toLocaleTimeString()
            : undefined,
        });
      });
    }

    // Final completion/failure step if completed/failed and not redundant
    const lastLogIsFinal =
      logs?.some(
        (l) =>
          l.message.toLowerCase().includes("completed") ||
          l.message.toLowerCase().includes("failed"),
      ) || false;
    if (!lastLogIsFinal) {
      if (exec.status === "SUCCESS") {
        steps.push({
          name: "Workflow Completed Successfully",
          status: "success",
          detail: exec.completedAt
            ? `Finished at: ${new Date(exec.completedAt).toLocaleTimeString()}`
            : undefined,
        });
      } else if (exec.status === "FAILED") {
        steps.push({
          name: "Workflow Failed",
          status: "failed",
          detail: exec.completedAt
            ? `Failed at: ${new Date(exec.completedAt).toLocaleTimeString()}`
            : undefined,
        });
      }
    }

    return steps;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied Execution ID to clipboard.");
  };

  return (
    <AppShell>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-6)",
        }}
      >
        {/* Title and selector row */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "var(--space-4)",
            borderBottom: "1px solid var(--border)",
            paddingBottom: "var(--space-4)",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
                letterSpacing: "-0.02em",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Activity size={22} color="var(--primary)" />
              Execution Center
            </h1>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                margin: "4px 0 0 0",
              }}
            >
              Observe live DM trigger events, monitor webhook executions, and
              inspect workflow history logs.
            </p>
          </div>

          {/* Active Profile indicators badge */}
          {statusData?.accounts && selectedAccountId && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {(() => {
                const acc = statusData.accounts.find(
                  (a) => a.id === selectedAccountId,
                );
                return acc ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      background: "var(--surface-secondary)",
                      padding: "4px 10px",
                      borderRadius: "12px",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "var(--success)",
                      }}
                    />
                    <span>
                      Active Profile:{" "}
                      <strong style={{ color: "var(--text-primary)" }}>
                        {acc.pageName}
                      </strong>
                    </span>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </div>

        {/* Toolbar Filter Deck */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-4)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "var(--space-3)",
            }}
          >
            {/* Search Input */}
            <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
              <Search
                size={14}
                color="var(--text-muted)"
                style={{ position: "absolute", left: "12px", top: "12px" }}
              />
              <input
                type="text"
                placeholder="Search by execution ID, trigger event, workflow..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 34px",
                  fontSize: "13px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "var(--surface-secondary)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
              />
            </div>

            {/* Filter by Status */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{ fontSize: "12px", color: "var(--text-secondary)" }}
              >
                Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "var(--surface-secondary)",
                  fontSize: "12px",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILED">Failed</option>
                <option value="WAITING">Waiting</option>
                <option value="RUNNING">Running</option>
                <option value="QUEUED">Queued</option>
              </select>
            </div>

            {/* Filter by Automation */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{ fontSize: "12px", color: "var(--text-secondary)" }}
              >
                Workflow:
              </span>
              <select
                value={automationFilter}
                onChange={(e) => setAutomationFilter(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "var(--surface-secondary)",
                  fontSize: "12px",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  maxWidth: "200px",
                }}
              >
                <option value="ALL">All Workflows</option>
                {automationsList.map((auto) => (
                  <option key={auto.id} value={auto.id}>
                    {auto.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Date */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{ fontSize: "12px", color: "var(--text-secondary)" }}
              >
                Date:
              </span>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "var(--surface-secondary)",
                  fontSize: "12px",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Last 24 Hours</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="WEEK">Last 7 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Execution Log Table view */}
        {executionsError ? (
          <div
            style={{
              padding: "var(--space-8)",
              background: "var(--danger-bg)",
              border: "1px solid #FECACA",
              borderRadius: "var(--radius-md)",
              color: "var(--danger)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <AlertCircle size={24} />
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>
                Failed to fetch execution records
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  margin: "4px 0 0 0",
                  color: "var(--text-secondary)",
                }}
              >
                {String(executionsError)}
              </p>
            </div>
            <button
              onClick={() => refetch()}
              style={{
                padding: "8px 16px",
                background: "var(--danger)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Retry Query
            </button>
          </div>
        ) : executionsLoading ? (
          <LoadingSkeleton variant="table" count={5} />
        ) : renderedExecutions.length === 0 ? (
          <div
            style={{
              padding: "var(--space-14)",
              background: "var(--surface)",
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-lg)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Database size={36} color="var(--text-muted)" />
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--text-primary)",
                margin: "8px 0 0 0",
              }}
            >
              No automation executions yet
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                margin: "0 0 var(--space-4) 0",
                maxWidth: 380,
                lineHeight: 1.6,
              }}
            >
              Create an automation and trigger it from Instagram to begin
              collecting execution history. Executions will appear here
              automatically once automations run.
            </p>
          </div>
        ) : (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.8fr 1.2fr 1fr 1.2fr 0.8fr 0.6fr",
                padding: "12px 16px",
                background: "var(--surface-secondary)",
                borderBottom: "1px solid var(--border)",
                fontSize: "12px",
                fontWeight: 650,
                color: "var(--text-secondary)",
              }}
            >
              <span>AUTOMATION & EXECUTION ID</span>
              <span>TRIGGER TYPE</span>
              <span>EVENT ID</span>
              <span>STARTED AT</span>
              <span>DURATION</span>
              <span style={{ textAlign: "right" }}>STATUS</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {renderedExecutions.map((exec) => {
                const triggerType =
                  exec.automation?.triggerType || "DIRECT_MESSAGE";
                const dateVal = new Date(exec.startedAt);
                const durationLabel =
                  exec.durationMs !== null
                    ? `${(exec.durationMs / 1000).toFixed(2)}s`
                    : "—";
                const isSelected = selectedExecutionId === exec.id;

                return (
                  <div
                    key={exec.id}
                    onClick={() => {
                      setSelectedExecutionId(exec.id);
                      setDrawerTab("details");
                    }}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.8fr 1.2fr 1fr 1.2fr 0.8fr 0.6fr",
                      padding: "14px 16px",
                      borderBottom: "1px solid var(--divider)",
                      fontSize: "13px",
                      alignItems: "center",
                      cursor: "pointer",
                      background: isSelected
                        ? "var(--hover-bg)"
                        : "transparent",
                      transition: "all var(--duration) var(--ease)",
                    }}
                    className="row-interactive"
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "3px",
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {exec.automation?.name || "Untitled Flow"}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          color: "var(--text-muted)",
                          fontFamily: "monospace",
                        }}
                      >
                        {exec.id}
                      </span>
                    </div>

                    <div>
                      <span
                        style={{
                          fontSize: "11px",
                          background: "var(--hover-bg)",
                          color: "var(--primary)",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontWeight: 550,
                        }}
                      >
                        {triggerType}
                      </span>
                    </div>

                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: "11px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {exec.eventId.slice(0, 12)}...
                    </div>

                    <div
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "12px",
                      }}
                    >
                      {dateVal.toLocaleDateString()}{" "}
                      {dateVal.toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </div>

                    <div
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "12px",
                      }}
                    >
                      {durationLabel}
                    </div>

                    <div
                      style={{ display: "flex", justifyContent: "flex-end" }}
                    >
                      {getStatusBadge(exec.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Execution Drawer Detail Panel (Stripe-Grade Sidebar) */}
      {selectedExecutionId && (
        <>
          {/* Backdrop overlay */}
          <div
            onClick={() => setSelectedExecutionId(null)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(2px)",
              zIndex: 999,
              transition: "opacity 0.25s ease-in-out",
            }}
          />

          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: "600px",
              height: "100%",
              backgroundColor: "var(--surface)",
              borderLeft: "1px solid var(--border)",
              boxShadow: "var(--shadow-xl)",
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              // Animation deleted for fast response or simplified
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                background: "var(--surface-secondary)",
              }}
            >
              <div
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--primary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  External Execution Audit Trail
                </span>
                <h2
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  {selectedExecution?.automation?.name || "Loading..."}
                </h2>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontFamily: "monospace",
                      color: "var(--text-muted)",
                    }}
                  >
                    ID: {selectedExecutionId}
                  </span>
                  <button
                    onClick={() => copyToClipboard(selectedExecutionId)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      display: "inline-flex",
                      padding: 2,
                    }}
                    title="Copy ID"
                  >
                    <Copy size={11} />
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: "6px",
                }}
              >
                {selectedExecution
                  ? getStatusBadge(selectedExecution.status)
                  : null}
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  {selectedExecution?.durationMs
                    ? `${(selectedExecution.durationMs / 1000).toFixed(2)}s duration`
                    : ""}
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div
              style={{
                display: "flex",
                background: "var(--surface-secondary)",
                borderBottom: "1px solid var(--border)",
                padding: "0 24px",
              }}
            >
              {(["details", "logs", "payload", "retries"] as const).map(
                (tab) => {
                  const isActive = drawerTab === tab;
                  const tabTitles = {
                    details: "Overview",
                    logs: "Console Logs",
                    payload: "JSON Payload",
                    retries: "Retry Warnings",
                  };

                  return (
                    <button
                      key={tab}
                      onClick={() => setDrawerTab(tab)}
                      style={{
                        padding: "12px 16px",
                        border: "none",
                        background: "none",
                        fontSize: "12px",
                        fontWeight: isActive ? 600 : 500,
                        color: isActive
                          ? "var(--primary)"
                          : "var(--text-secondary)",
                        borderBottom: isActive
                          ? "2px solid var(--primary)"
                          : "2px solid transparent",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        marginBottom: "-1px",
                      }}
                    >
                      {tabTitles[tab]}
                    </button>
                  );
                },
              )}
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
              {detailLoading ? (
                <div style={{ padding: "40px", textAlign: "center" }}>
                  <span
                    style={{ fontSize: "14px", color: "var(--text-muted)" }}
                  >
                    Loading execution logs from database...
                  </span>
                </div>
              ) : selectedExecution ? (
                <>
                  {/* TAB 1: OVERVIEW & TIMELINE */}
                  {drawerTab === "details" && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--space-6)",
                      }}
                    >
                      {/* Timeline Visualizer */}
                      <div>
                        <h3
                          style={{
                            fontSize: "13px",
                            fontWeight: 650,
                            color: "var(--text-primary)",
                            marginBottom: "var(--space-4)",
                          }}
                        >
                          Event Execution Flow
                        </h3>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0,
                          }}
                        >
                          {getTimelineSteps(
                            selectedExecution,
                            selectedExecutionLogs,
                          ).map((step, sIdx, arr) => {
                            const isLast = sIdx === arr.length - 1;
                            let iconBg = "var(--success-bg)";
                            let iconColor = "var(--success)";
                            if (step.status === "failed") {
                              iconBg = "var(--danger-bg)";
                              iconColor = "var(--danger)";
                            }
                            if (step.status === "waiting") {
                              iconBg = "var(--warning-bg)";
                              iconColor = "var(--warning)";
                            }
                            if (step.status === "running") {
                              iconBg = "#EFF6FF";
                              iconColor = "#3B82F6";
                            }
                            if (step.status === "skipped") {
                              iconBg = "var(--divider)";
                              iconColor = "var(--text-muted)";
                            }

                            return (
                              <div
                                key={sIdx}
                                style={{ display: "flex", gap: "14px" }}
                              >
                                {/* Step line and dot */}
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: "24px",
                                      height: "24px",
                                      borderRadius: "50%",
                                      background: iconBg,
                                      color: iconColor,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "10px",
                                    }}
                                  >
                                    {step.status === "success" && (
                                      <span style={{ fontWeight: "bold" }}>
                                        ✓
                                      </span>
                                    )}
                                    {step.status === "failed" && (
                                      <span style={{ fontWeight: "bold" }}>
                                        ✗
                                      </span>
                                    )}
                                    {step.status === "waiting" && (
                                      <span
                                        className="loader-dots"
                                        style={{
                                          width: 4,
                                          height: 4,
                                          background: "var(--warning)",
                                          borderRadius: "50%",
                                        }}
                                      />
                                    )}
                                    {step.status === "skipped" && (
                                      <span style={{ fontSize: 9 }}>—</span>
                                    )}
                                    {step.status === "running" && (
                                      <span style={{ fontSize: 8 }}>●</span>
                                    )}
                                  </div>
                                  {!isLast && (
                                    <div
                                      style={{
                                        width: "2px",
                                        flexGrow: 1,
                                        minHeight: "28px",
                                        background: "var(--border)",
                                        margin: "4px 0",
                                      }}
                                    />
                                  )}
                                </div>

                                {/* Info */}
                                <div
                                  style={{
                                    paddingBottom: isLast ? 0 : "20px",
                                    marginTop: "2px",
                                  }}
                                >
                                  <span
                                    style={{
                                      display: "block",
                                      fontSize: "13px",
                                      fontWeight: 600,
                                      color: "var(--text-primary)",
                                    }}
                                  >
                                    {step.name}
                                  </span>
                                  {step.detail && (
                                    <span
                                      style={{
                                        display: "block",
                                        fontSize: "11px",
                                        color: "var(--text-muted)",
                                        marginTop: "2px",
                                        fontFamily: "monospace",
                                      }}
                                    >
                                      {step.detail}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Capture Details */}
                      <div
                        style={{
                          borderTop: "1px solid var(--divider)",
                          paddingTop: "var(--space-4)",
                        }}
                      >
                        <h3
                          style={{
                            fontSize: "13px",
                            fontWeight: 650,
                            color: "var(--text-primary)",
                            marginBottom: "var(--space-3)",
                          }}
                        >
                          Execution Metrics & Attributes
                        </h3>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "12px",
                            }}
                          >
                            <span style={{ color: "var(--text-muted)" }}>
                              Execution ID
                            </span>
                            <span
                              style={{
                                fontFamily: "monospace",
                                color: "var(--text-primary)",
                              }}
                            >
                              {selectedExecution.id}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "12px",
                            }}
                          >
                            <span style={{ color: "var(--text-muted)" }}>
                              Automation Flow
                            </span>
                            <span
                              style={{
                                fontWeight: 600,
                                color: "var(--text-primary)",
                              }}
                            >
                              {selectedExecution.automation?.name ||
                                "Untitled Flow"}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "12px",
                            }}
                          >
                            <span style={{ color: "var(--text-muted)" }}>
                              Trigger Type
                            </span>
                            <span
                              style={{
                                color: "var(--primary)",
                                fontWeight: 550,
                              }}
                            >
                              {selectedExecution.automation?.triggerType ||
                                "DIRECT_MESSAGE"}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "12px",
                            }}
                          >
                            <span style={{ color: "var(--text-muted)" }}>
                              Current Status
                            </span>
                            <span>
                              {getStatusBadge(selectedExecution.status)}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "12px",
                            }}
                          >
                            <span style={{ color: "var(--text-muted)" }}>
                              Started At
                            </span>
                            <span style={{ color: "var(--text-primary)" }}>
                              {new Date(
                                selectedExecution.startedAt,
                              ).toLocaleString()}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "12px",
                            }}
                          >
                            <span style={{ color: "var(--text-muted)" }}>
                              Finished At
                            </span>
                            <span style={{ color: "var(--text-primary)" }}>
                              {selectedExecution.completedAt
                                ? new Date(
                                    selectedExecution.completedAt,
                                  ).toLocaleString()
                                : "—"}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "12px",
                            }}
                          >
                            <span style={{ color: "var(--text-muted)" }}>
                              Duration
                            </span>
                            <span style={{ color: "var(--text-primary)" }}>
                              {selectedExecution.durationMs
                                ? `${(selectedExecution.durationMs / 1000).toFixed(2)}s`
                                : "—"}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "12px",
                            }}
                          >
                            <span style={{ color: "var(--text-muted)" }}>
                              Instagram Account
                            </span>
                            <span
                              style={{
                                fontWeight: 550,
                                color: "var(--text-primary)",
                              }}
                            >
                              {activeAccount ? activeAccount.pageName : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: TERMINAL CONSOLE LOGS */}
                  {drawerTab === "logs" && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--text-muted)",
                          }}
                        >
                          Terminal traces captured chronologically:
                        </span>
                      </div>

                      <div
                        style={{
                          background: "#0F172A",
                          borderRadius: "var(--radius-md)",
                          padding: "16px",
                          fontFamily: "monospace",
                          fontSize: "11px",
                          color: "#E2E8F0",
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                          maxHeight: "440px",
                          overflowY: "auto",
                          boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.4)",
                        }}
                      >
                        {selectedExecutionLogs.map((log: any, lIdx: number) => {
                          const t = new Date(log.createdAt);
                          const isErr =
                            log.level === "ERROR" || log.level === "FATAL";
                          const isWarn = log.level === "WARN";
                          let color = "#38BDF8";
                          if (isErr) color = "#F87171";
                          if (isWarn) color = "#FBBF24";

                          return (
                            <div
                              key={lIdx}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "6px",
                              }}
                            >
                              <span style={{ color: "#64748B", flexShrink: 0 }}>
                                [{t.toLocaleTimeString([], { hour12: false })}]
                              </span>
                              <span
                                style={{
                                  color,
                                  fontWeight: "bold",
                                  width: "42px",
                                  flexShrink: 0,
                                }}
                              >
                                {log.level}
                              </span>
                              <div style={{ flex: 1, wordBreak: "break-all" }}>
                                <span>{log.message}</span>
                                {log.metadata &&
                                  Object.keys(log.metadata).length > 0 && (
                                    <pre
                                      style={{
                                        margin: "4px 0 0 0",
                                        color: "#94A3B8",
                                        fontSize: "10px",
                                      }}
                                    >
                                      {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                  )}
                              </div>
                            </div>
                          );
                        })}

                        {selectedExecutionLogs.length === 0 && (
                          <div
                            style={{
                              color: "#64748B",
                              textAlign: "center",
                              padding: "20px 0",
                            }}
                          >
                            No logs available.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: JSON PAYLOAD VIEW */}
                  {drawerTab === "payload" && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--text-muted)",
                          }}
                        >
                          Full incoming event metadata body:
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              JSON.stringify(selectedExecution, null, 2),
                            )
                          }
                          style={{
                            padding: "4px 8px",
                            fontSize: "11px",
                            background: "var(--hover-bg)",
                            border: "1px solid var(--border)",
                            borderRadius: "4px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          Copy JSON
                        </button>
                      </div>

                      <pre
                        style={{
                          background: "var(--hover-bg)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-md)",
                          padding: "16px",
                          fontSize: "11px",
                          fontFamily: "monospace",
                          overflow: "auto",
                          maxHeight: "425px",
                          color: "var(--text-primary)",
                        }}
                      >
                        {JSON.stringify(selectedExecution, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* TAB 4: RETRY STATISTICS HISTORY */}
                  {drawerTab === "retries" && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            fontSize: "13px",
                            fontWeight: 650,
                            color: "var(--text-primary)",
                            marginBottom: "4px",
                          }}
                        >
                          Execution Warnings Traces
                        </h3>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "var(--text-secondary)",
                            margin: 0,
                          }}
                        >
                          Warning levels logged during automation execution
                          attempts:
                        </p>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        {selectedExecutionLogs
                          .filter(
                            (l) =>
                              l.level === "WARN" ||
                              l.message.toLowerCase().includes("retry"),
                          )
                          .map((log: any, idx: number) => (
                            <div
                              key={idx}
                              style={{
                                border: "1px solid var(--border)",
                                borderRadius: "var(--radius-md)",
                                padding: "12px",
                                background: "var(--surface-secondary)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "12px",
                                    fontWeight: 650,
                                    color: "var(--text-primary)",
                                  }}
                                >
                                  Warning Trace
                                </span>
                                <span
                                  style={{
                                    fontSize: "11px",
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  {new Date(log.createdAt).toLocaleTimeString()}
                                </span>
                              </div>
                              <p
                                style={{
                                  fontSize: "11px",
                                  fontFamily: "monospace",
                                  color: "var(--warning)",
                                  margin: "6px 0 0 0",
                                  wordBreak: "break-all",
                                }}
                              >
                                {log.message}
                              </p>
                            </div>
                          ))}

                        {selectedExecutionLogs.filter(
                          (l) =>
                            l.level === "WARN" ||
                            l.message.toLowerCase().includes("retry"),
                        ).length === 0 && (
                          <div
                            style={{
                              textAlign: "center",
                              padding: "30px",
                              border: "1px dashed var(--border)",
                              borderRadius: "var(--radius-lg)",
                              color: "var(--text-muted)",
                            }}
                          >
                            <p style={{ fontSize: "12px", margin: 0 }}>
                              No warning or retry incidents recorded for this
                              execution.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Footer close option */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "flex-end",
                background: "var(--surface-secondary)",
              }}
            >
              <button
                onClick={() => setSelectedExecutionId(null)}
                style={{
                  padding: "8px 16px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                Close Drawer
              </button>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
