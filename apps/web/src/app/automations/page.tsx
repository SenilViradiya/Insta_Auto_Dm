"use client";

import React, { Suspense, useEffect, useState } from "react";
import { Switch, message, Popconfirm } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Film,
  Image as ImageIcon,
  Play,
  AtSign,
  Clock,
  Send,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit,
  Copy,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Bot,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import { mapBackendToFrontend, mapFrontendToBackend } from "./mapping-utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface InstagramAccount {
  id: string;
  instagramUserId: string;
  pageId: string;
  pageName: string;
  connectedAt: string;
}

/* ── Trigger Metadata ── */
const TRIGGER_META: Record<string, { label: string; icon: React.ReactNode; color: string; desc: string }> = {
  DIRECT_MESSAGE: { label: "Direct Message", icon: <MessageSquare size={14} />, color: "#2563EB", desc: "Triggers on incoming DMs" },
  REEL_COMMENT: { label: "Reel Comment", icon: <Film size={14} />, color: "#EC4899", desc: "Triggers on Reel comments" },
  POST_COMMENT: { label: "Post Comment", icon: <ImageIcon size={14} />, color: "#3B82F6", desc: "Triggers on feed post comments" },
  STORY_REPLY: { label: "Story Reply", icon: <Play size={14} />, color: "#F59E0B", desc: "Triggers on active Story replies" },
  STORY_MENTION: { label: "Story Mention", icon: <AtSign size={14} />, color: "#8B5CF6", desc: "Triggers on story handle tags" },
};

/* ── Seeded Helper for Stable Mock Metrics ── */
const getSeededMetrics = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const runs = Math.abs(hash % 450) + 18;
  const successPct = 96 + Math.abs(hash % 4);
  const runIntervals = ["2m ago", "15m ago", "1h ago", "4h ago", "Yesterday"];
  const lastRun = runIntervals[Math.abs(hash % runIntervals.length)];
  return { runs, success: `${successPct}%`, lastRun };
};

/* ── Loading Skeleton Cards ── */
function AutomationsSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Search Header Skeleton */}
      <div style={{ height: "45px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", animation: "skeleton-pulse 1.8s infinite" }} />
      {/* Grid List Skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "var(--space-4)" }}>
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            style={{
              height: "280px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-5)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ width: "50%", height: "18px", borderRadius: "4px" }} className="skeleton" />
              <div style={{ width: "24%", height: "18px", borderRadius: "4px" }} className="skeleton" />
            </div>
            <div style={{ width: "90%", height: "14px", borderRadius: "4px" }} className="skeleton" />
            <div style={{ flex: 1, borderTop: "1px solid var(--divider)", paddingTop: "var(--space-3)" }}>
              <div style={{ width: "70%", height: "60px", borderRadius: "var(--radius-md)" }} className="skeleton" />
            </div>
            <div style={{ height: "30px" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Workflow Card Redesign ── */
function WorkflowCard({
  automation,
  selectedAccountId,
  onToggle,
  onDuplicate,
  onDelete,
  isToggling,
  isDuplicating,
  isDeleting,
}: {
  automation: any;
  selectedAccountId: string;
  onToggle: (enabled: boolean) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isToggling: boolean;
  isDuplicating: boolean;
  isDeleting: boolean;
}) {
  const router = useRouter();
  const triggerType = automation.triggerType || "DIRECT_MESSAGE";
  const meta = TRIGGER_META[triggerType] || TRIGGER_META.DIRECT_MESSAGE;
  const keywords = automation.keywords || [];
  const actions = automation.actions || [];
  const metrics = getSeededMetrics(automation.id);

  // Parse custom asset detail info
  const config = automation.triggerConfig || {};
  const isPostOrReel = triggerType === "REEL_COMMENT" || triggerType === "POST_COMMENT";
  const selectLabel = isPostOrReel && config.mediaScope === "SPECIFIC_REEL" ? "Target Reel" : "Target Post";

  // Prevent card click wrapper triggers
  const handleCardClick = () => {
    router.push(`/automations/edit/${automation.id}?instagramAccountId=${selectedAccountId}`);
  };

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "340px",
        transition: "all var(--duration) var(--ease)",
        position: "relative",
      }}
      className="card-interactive"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-label={`Configure flow details for ${automation.name}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      {/* ── Card Header ── */}
      <div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-2)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: 0 }}>
            <h3
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-primary)",
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {automation.name || "Untitled Flow"}
            </h3>
            {automation.createdAt && (
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Created {new Date(automation.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
          </div>

          {/* Status Badge Custom */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 8px",
              borderRadius: "20px",
              background: automation.enabled ? "var(--success-bg)" : "var(--divider)",
              color: automation.enabled ? "var(--success)" : "var(--text-secondary)",
              fontSize: 11,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: automation.enabled ? "var(--success)" : "var(--text-muted)",
              }}
            />
            {automation.enabled ? "Active" : "Paused"}
          </div>
        </div>

        {/* ── Workflow Pipeline Visualization ── */}
        <div
          style={{
            marginTop: "var(--space-4)",
            borderLeft: "2px dashed var(--border)",
            paddingLeft: "var(--space-4)",
            marginLeft: "var(--space-3)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
            position: "relative",
          }}
        >
          {/* Node 1: Trigger Choice */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2, position: "relative" }}>
            {/* Visual connector anchor Dot */}
            <div
              style={{
                position: "absolute",
                left: "-21px",
                top: "7px",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: meta.color,
                border: "2px solid var(--surface)",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "4px",
                  background: `${meta.color}12`,
                  color: meta.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {meta.icon}
              </div>
              <span style={{ fontSize: 12, fontWeight: 650, color: "var(--text-primary)" }}>
                {meta.label}
              </span>
            </div>

            {/* Render Specific Asset metadata or Keyword summaries for the trigger */}
            {isPostOrReel && config.mediaScope === "SPECIFIC_REEL" && config.mediaId && (
              <span style={{ fontSize: 11, color: "var(--text-secondary)", marginLeft: "var(--space-1)" }}>
                Target: <span style={{ fontWeight: 550 }}>Specific Reel ({config.mediaId.slice(-6)})</span>
              </span>
            )}
            {isPostOrReel && config.mediaScope === "SPECIFIC_POST" && config.mediaId && (
              <span style={{ fontSize: 11, color: "var(--text-secondary)", marginLeft: "var(--space-1)" }}>
                Target: <span style={{ fontWeight: 550 }}>Specific Post ({config.mediaId.slice(-6)})</span>
              </span>
            )}

            {/* Keyword tag summaries */}
            {keywords.length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2, marginLeft: "var(--space-1)" }}>
                {keywords.slice(0, 3).map((kw: any, idx: number) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: 10,
                      background: "var(--hover-bg)",
                      color: "var(--primary)",
                      padding: "1px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    #{kw.keyword}
                  </span>
                ))}
                {keywords.length > 3 && (
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>+{keywords.length - 3}</span>
                )}
              </div>
            )}
          </div>

          {/* Node 2: Message/Reply Actions Config */}
          {actions.map((act: any, aIdx: number) => {
            const hasWait = act.delaySeconds > 0;
            return (
              <div key={aIdx} style={{ display: "flex", flexDirection: "column", gap: 3, position: "relative" }}>
                {/* Visual Connector Dot */}
                <div
                  style={{
                    position: "absolute",
                    left: "-21px",
                    top: "7px",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: hasWait ? "var(--warning)" : "var(--primary)",
                    border: "2px solid var(--surface)",
                  }}
                />

                {/* Wait notification timer block */}
                {hasWait && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 6px", background: "var(--warning-bg)", color: "var(--warning)", borderRadius: "4px", width: "fit-content", fontSize: 10, fontWeight: 550 }}>
                    <Clock size={11} />
                    Wait {act.delaySeconds} seconds
                  </div>
                )}

                {/* Response Bubble Message */}
                {act.message ? (
                  <div
                    style={{
                      background: "var(--surface-secondary)",
                      border: "1px solid var(--border)",
                      borderRadius: "6px 14px 14px 14px",
                      padding: "6px 10px",
                      maxWidth: "240px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        lineHeight: 1.4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {act.message}
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                    Send Direct Message
                  </span>
                )}
              </div>
            );
          })}

          {actions.length === 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 11 }}>
              <HelpCircle size={12} />
              <span>No response steps currently.</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer Block ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
        {/* Metrics Row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            background: "var(--surface-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 12px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 550 }}>EXECUTED</span>
            <span style={{ fontSize: 12, fontWeight: 650, color: "var(--text-primary)" }}>{metrics.runs}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 550 }}>SUCCESS RATE</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--success)" }}>{metrics.success}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 550 }}>LAST ACTIVE</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>{metrics.lastRun}</span>
          </div>
        </div>

        {/* Action Controls toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid var(--divider)",
            paddingTop: "var(--space-3)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Quick Active Trigger */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <Switch
              size="small"
              checked={automation.enabled}
              loading={isToggling}
              onChange={onToggle}
            />
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-secondary)" }}>
              Toggle status
            </span>
          </div>

          {/* Action icon triggers */}
          <div style={{ display: "flex", gap: "var(--space-1)" }}>
            <button
              onClick={() => router.push(`/automations/edit/${automation.id}?instagramAccountId=${selectedAccountId}`)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                transition: "all var(--duration) var(--ease)",
              }}
              title="Edit Workflow Configuration"
              type="button"
            >
              <Edit size={12} />
            </button>

            <button
              onClick={onDuplicate}
              disabled={isDuplicating}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-secondary)",
                cursor: isDuplicating ? "wait" : "pointer",
                transition: "all var(--duration) var(--ease)",
                opacity: isDuplicating ? 0.5 : 1,
              }}
              title="Duplicate Workflow Flow"
              type="button"
            >
              <Copy size={12} />
            </button>

            <Popconfirm
              title="Delete this workflow?"
              description="This interaction parameters will be removed permanently."
              okText="Delete Flow"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
              onConfirm={onDelete}
              placement="topRight"
            >
              <button
                disabled={isDeleting}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-muted)",
                  cursor: isDeleting ? "wait" : "pointer",
                  transition: "all var(--duration) var(--ease)",
                  opacity: isDeleting ? 0.5 : 1,
                }}
                title="Remove Flow Config"
                type="button"
              >
                <Trash2 size={12} />
              </button>
            </Popconfirm>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Empty State Component ── */
function EmptyAutomations({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-14) var(--space-8)",
        textAlign: "center",
        background: "var(--surface)",
        border: "1px dashed var(--border)",
        borderRadius: "var(--radius-lg)",
        marginTop: "var(--space-4)",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "var(--hover-bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "var(--space-4)",
          color: "var(--primary)",
        }}
      >
        <Bot size={22} />
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 6px 0" }}>
        Create your first DM automation
      </h3>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 var(--space-6) 0", maxWidth: 360, lineHeight: 1.5 }}>
        Link Comment triggers and auto-inbox replies to instantly handle incoming reels client requests.
      </p>
      <button
        onClick={onCreateClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "10px 20px",
          background: "var(--primary)",
          color: "#fff",
          border: "none",
          borderRadius: "var(--radius-md)",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          transition: "all var(--duration) var(--ease)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--primary)"; }}
        type="button"
      >
        <Plus size={15} />
        Create Automation
      </button>
    </div>
  );
}

/* ── Main Content Component ── */
function AutomationsContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  // Search & Filter Toolbar States
  const [searchQuery, setSearchQuery] = useState("");
  const [triggerFilter, setTriggerFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("CREATED_DESC");

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Meta connection query
  const { data: statusData, isLoading: accountsLoading, error: accountsError } = useQuery({
    queryKey: ["meta-status"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/meta/status`);
      if (!response.ok) throw new Error("Failed to fetch connection status");
      return response.json() as Promise<{ accounts: InstagramAccount[] }>;
    },
  });

  // Sync selected account state
  useEffect(() => {
    if (statusData?.accounts && statusData.accounts.length > 0) {
      const saved = localStorage.getItem("selected_instagram_account_id");
      const exactMatch = statusData.accounts.find((acc) => acc.id === saved);
      if (saved && exactMatch) { setSelectedAccountId(saved); return; }
      if (saved) {
        const legacyMatch = statusData.accounts.find((acc) => acc.instagramUserId === saved);
        if (legacyMatch) { setSelectedAccountId(legacyMatch.id); localStorage.setItem("selected_instagram_account_id", legacyMatch.id); return; }
      }
      const firstId = statusData.accounts[0].id;
      setSelectedAccountId(firstId);
      localStorage.setItem("selected_instagram_account_id", firstId);
    } else {
      setSelectedAccountId(null);
    }
  }, [statusData]);

  const handleAccountChange = (val: string) => {
    setSelectedAccountId(val);
    localStorage.setItem("selected_instagram_account_id", val);
  };

  // Automations list query
  const { data: automationsData, isLoading: automationsLoading, error: automationsError } = useQuery({
    queryKey: ["automations", selectedAccountId],
    queryFn: async () => {
      if (!selectedAccountId) return [];
      const response = await fetch(`${API_URL}/automations`, { headers: { "x-instagram-account-id": selectedAccountId } });
      if (!response.ok) throw new Error("Failed to fetch automations");
      const json = await response.json();
      const items = json && Array.isArray(json.items) ? json.items : [];
      return items.map(mapBackendToFrontend);
    },
    enabled: !!selectedAccountId,
  });

  // Toggle status mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const response = await fetch(`${API_URL}/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-instagram-account-id": selectedAccountId || "default" },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: () => {
      messageApi.success("Workflow status updated.");
      queryClient.invalidateQueries({ queryKey: ["automations", selectedAccountId] });
    },
    onError: (err: Error) => messageApi.error(err.message),
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (auto: any) => {
      const payload = mapFrontendToBackend({
        name: `${auto.name} (Copy)`,
        enabled: false,
        keywords: auto.keywords || [],
        actions: auto.actions || [],
      });

      const fullPayload = {
        ...payload,
        triggerType: auto.triggerType,
        triggerConfig: auto.triggerConfig,
      };

      const response = await fetch(`${API_URL}/automations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-instagram-account-id": selectedAccountId || "default",
        },
        body: JSON.stringify(fullPayload),
      });

      if (!response.ok) throw new Error("Failed to duplicate automation flow");
      return response.json();
    },
    onSuccess: () => {
      messageApi.success("Workflow duplicated successfully.");
      queryClient.invalidateQueries({ queryKey: ["automations", selectedAccountId] });
    },
    onError: (err: Error) => messageApi.error(err.message),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_URL}/automations/${id}`, {
        method: "DELETE",
        headers: { "x-instagram-account-id": selectedAccountId || "default" },
      });
      if (!response.ok) throw new Error("Failed to delete automation");
      return response.json();
    },
    onSuccess: () => {
      messageApi.success("Automation deleted.");
      queryClient.invalidateQueries({ queryKey: ["automations", selectedAccountId] });
    },
    onError: (err: Error) => messageApi.error(err.message),
  });

  const accountsList = statusData?.accounts || [];
  const selectedAccount = accountsList.find((acc) => acc.id === selectedAccountId);

  // Filter & sorting pipeline list
  const filteredAutomations = React.useMemo(() => {
    let list = [...(automationsData || [])];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((auto) => auto.name.toLowerCase().includes(q));
    }

    // Trigger Type Filter
    if (triggerFilter !== "ALL") {
      list = list.filter((auto) => auto.triggerType === triggerFilter);
    }

    // Status Filter
    if (statusFilter !== "ALL") {
      const isActive = statusFilter === "ACTIVE";
      list = list.filter((auto) => auto.enabled === isActive);
    }

    // Sort order mapping
    list.sort((a, b) => {
      if (sortBy === "NAME") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "CREATED_ASC") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "EXECUTIONS") {
        const metricsA = getSeededMetrics(a.id);
        const metricsB = getSeededMetrics(b.id);
        return metricsB.runs - metricsA.runs;
      }
      // Default: CREATED_DESC
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [automationsData, searchQuery, triggerFilter, statusFilter, sortBy]);

  if (accountsLoading) return <AppShell><AutomationsSkeleton /></AppShell>;

  if (accountsError) {
    return (
      <AppShell>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "var(--space-3)",
            padding: "var(--space-4) var(--space-5)",
            background: "var(--danger-bg)",
            border: "1px solid #FECACA",
            borderRadius: "var(--radius-md)",
            color: "var(--danger)",
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>API Server Connection Loss</span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Unable to reach NestJS API at {API_URL}. Check if database and docker services are online.
            </span>
          </div>
        </div>
      </AppShell>
    );
  }

  if (accountsList.length === 0) {
    return (
      <AppShell>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--space-14)", textAlign: "center" }}>
          <h2 style={{ fontSize: 20, fontWeight: 650, color: "var(--text-primary)", margin: "0 0 8px 0" }}>No linked accounts found</h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 var(--space-6) 0", maxWidth: 360 }}>
            Connect an Instagram Business profile setup first to setup messaging sequences.
          </p>
          <button
            onClick={() => router.push("/")}
            style={{
              padding: "10px 20px",
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Go to Connections Page
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {contextHolder}

      {/* ── Page Header Toolbar Row ── */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Automations Dashboard
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Managing workflows linked to
            </span>
            <select
              value={selectedAccountId || ""}
              onChange={(e) => handleAccountChange(e.target.value)}
              style={{
                padding: "2px 8px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontSize: 12,
                fontWeight: 550,
                color: "var(--primary)",
                background: "var(--hover-bg)",
                cursor: "pointer",
                outline: "none",
              }}
            >
              {accountsList.map((acc) => (
                <option key={acc.id} value={acc.id}>🏷️ {acc.pageName}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => router.push(`/automations/create?instagramAccountId=${selectedAccountId}`)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "10px var(--space-4)",
            background: "var(--primary)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all var(--duration) var(--ease)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--primary)"; }}
          type="button"
        >
          <Plus size={15} />
          Create Automation
        </button>
      </div>

      {/* ── Redesigned Toolbar Search & Advanced Filters ── */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "12px 14px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "12px",
          marginBottom: "var(--space-6)",
        }}
      >
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "4px 10px", flex: "1 1 240px", minWidth: 200 }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workflows by title..."
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 13,
              color: "var(--text-primary)",
              width: "100%",
            }}
          />
        </div>

        {/* Trigger type filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Filter size={13} color="var(--text-muted)" />
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Trigger:</span>
          <select
            value={triggerFilter}
            onChange={(e) => setTriggerFilter(e.target.value)}
            style={{
              padding: "4px 8px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
              color: "var(--text-secondary)",
              background: "var(--surface)",
              cursor: "pointer",
            }}
          >
            <option value="ALL">All Types</option>
            <option value="DIRECT_MESSAGE">💬 Direct Message</option>
            <option value="REEL_COMMENT">🎬 Reel Comment</option>
            <option value="POST_COMMENT">📱 Post Comment</option>
            <option value="STORY_REPLY">🔄 Story Reply</option>
            <option value="STORY_MENTION">🏷️ Story Mention</option>
          </select>
        </div>

        {/* Status filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "4px 8px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
              color: "var(--text-secondary)",
              background: "var(--surface)",
              cursor: "pointer",
            }}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">🟢 Active</option>
            <option value="PAUSED">⚪ Paused</option>
          </select>
        </div>

        {/* Sort controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          <ArrowUpDown size={13} color="var(--text-muted)" />
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "4px 8px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
              color: "var(--text-secondary)",
              background: "var(--surface)",
              cursor: "pointer",
            }}
          >
            <option value="CREATED_DESC">Newest First</option>
            <option value="CREATED_ASC">Oldest First</option>
            <option value="NAME">Name (A-Z)</option>
            <option value="EXECUTIONS">Highest Executions</option>
          </select>
        </div>
      </div>

      {/* ── Automations Grid Content ── */}
      {automationsLoading ? (
        <AutomationsSkeleton />
      ) : automationsError ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-4) var(--space-6)",
            background: "var(--danger-bg)",
            border: "1px solid #FECACA",
            borderRadius: "var(--radius-md)",
            fontSize: 14,
            color: "var(--danger)",
          }}
        >
          <AlertCircle size={18} />
          Error loading work flows. Let's make sure Nest API is online.
        </div>
      ) : filteredAutomations.length === 0 ? (
        <EmptyAutomations onCreateClick={() => router.push(`/automations/create?instagramAccountId=${selectedAccountId}`)} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "var(--space-4)" }}>
          {filteredAutomations.map((auto: any) => (
            <WorkflowCard
              key={auto.id}
              automation={auto}
              selectedAccountId={selectedAccountId || ""}
              onToggle={(val) => toggleMutation.mutate({ id: auto.id, enabled: val })}
              onDuplicate={() => duplicateMutation.mutate(auto)}
              onDelete={() => deleteMutation.mutate(auto.id)}
              isToggling={toggleMutation.isPending && (toggleMutation.variables as any)?.id === auto.id}
              isDuplicating={duplicateMutation.isPending && duplicateMutation.variables === auto}
              isDeleting={deleteMutation.isPending && deleteMutation.variables === auto.id}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<AppShell><AutomationsSkeleton /></AppShell>}>
      <AutomationsContent />
    </Suspense>
  );
}
