"use client";

import React, { Suspense, useEffect, useState } from "react";
import { Switch, message, Popconfirm } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Plus,
  MessageSquare,
  Film,
  Image,
  Play,
  AtSign,
  Pencil,
  Trash2,
  Bot,
  ChevronDown,
  Zap,
  Clock,
  Send,
  AlertCircle,
  CircleCheck,
} from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import { mapBackendToFrontend } from "./mapping-utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface InstagramAccount {
  id: string;
  instagramUserId: string;
  pageId: string;
  pageName: string;
  connectedAt: string;
}

/* ── Trigger Meta ── */
const TRIGGER_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  DIRECT_MESSAGE: { label: "Direct Message", icon: <MessageSquare size={14} />, color: "var(--primary)" },
  REEL_COMMENT: { label: "Reel Comment", icon: <Film size={14} />, color: "#DB2777" },
  POST_COMMENT: { label: "Post Comment", icon: <Image size={14} />, color: "var(--success)" },
  STORY_REPLY: { label: "Story Reply", icon: <Play size={14} />, color: "var(--warning)" },
  STORY_MENTION: { label: "Story Mention", icon: <AtSign size={14} />, color: "#7C3AED" },
};

/* ── Skeleton ── */
function AutomationsSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div className="skeleton skeleton-title" style={{ width: 220 }} />
          <div className="skeleton skeleton-text" style={{ width: 300 }} />
        </div>
        <div className="skeleton" style={{ width: 170, height: 40, borderRadius: "var(--radius-md)" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "var(--space-4)" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 200, borderRadius: "var(--radius-lg)" }} />
        ))}
      </div>
    </div>
  );
}

/* ── Workflow Card ── */
function WorkflowCard({
  automation,
  selectedAccountId,
  onToggle,
  onDelete,
  isToggling,
  isDeleting,
}: {
  automation: any;
  selectedAccountId: string;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
  isToggling: boolean;
  isDeleting: boolean;
}) {
  const router = useRouter();
  const triggerType = automation.triggerType || "DIRECT_MESSAGE";
  const meta = TRIGGER_META[triggerType] || TRIGGER_META.DIRECT_MESSAGE;
  const keywords = Array.isArray(automation.keywords) ? automation.keywords.filter((k: any) => k?.keyword) : [];
  const actions = Array.isArray(automation.actions) ? automation.actions : [];

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        transition: "all var(--duration) var(--ease)",
        cursor: "pointer",
        position: "relative",
      }}
      className="card-interactive"
      onClick={() => router.push(`/automations/edit/${automation.id}?instagramAccountId=${selectedAccountId}`)}
      role="button"
      tabIndex={0}
      aria-label={`Edit automation ${automation.name}`}
      onKeyDown={(e) => { if (e.key === "Enter") router.push(`/automations/edit/${automation.id}?instagramAccountId=${selectedAccountId}`); }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", flex: 1, minWidth: 0 }}>
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
            {automation.name || "Untitled Workflow"}
          </h3>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Created {automation.createdAt ? new Date(automation.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
          </span>
        </div>
        <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <Switch
            size="small"
            checked={automation.enabled}
            loading={isToggling}
            onChange={onToggle}
          />
        </div>
      </div>

      {/* Pipeline summary */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {/* Trigger */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "var(--radius-sm)",
              background: `${meta.color}14`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: meta.color,
              flexShrink: 0,
            }}
          >
            {meta.icon}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
            {meta.label}
          </span>
          {keywords.length > 0 && (
            <div style={{ display: "flex", gap: "var(--space-1)", flexWrap: "wrap" }}>
              {keywords.slice(0, 3).map((kw: any, i: number) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--primary)",
                    background: "var(--hover-bg)",
                    padding: "1px 8px",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  {kw.keyword}
                </span>
              ))}
              {keywords.length > 3 && (
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>+{keywords.length - 3}</span>
              )}
            </div>
          )}
        </div>

        {/* Connector */}
        <div style={{ marginLeft: 11, width: 2, height: 12, background: "var(--border)" }} />

        {/* Actions Summary */}
        {actions.map((act: any, i: number) => (
          <React.Fragment key={i}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "var(--radius-sm)",
                  background: act.delaySeconds > 0 ? "var(--warning-bg)" : "var(--hover-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: act.delaySeconds > 0 ? "var(--warning)" : "var(--primary)",
                  flexShrink: 0,
                }}
              >
                {act.delaySeconds > 0 ? <Clock size={13} /> : <Send size={13} />}
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {act.delaySeconds > 0 && (
                  <span style={{ color: "var(--warning)", fontWeight: 500 }}>Wait {act.delaySeconds}s → </span>
                )}
                {act.message ? `"${act.message.substring(0, 50)}${act.message.length > 50 ? "…" : ""}"` : "Send DM"}
              </span>
            </div>
            {i < actions.length - 1 && (
              <div style={{ marginLeft: 11, width: 2, height: 8, background: "var(--border)" }} />
            )}
          </React.Fragment>
        ))}

        {actions.length === 0 && (
          <span style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>No actions configured</span>
        )}
      </div>

      {/* Footer Actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid var(--divider)",
          paddingTop: "var(--space-3)",
          marginTop: "var(--space-1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-1)",
            fontSize: 12,
            fontWeight: 500,
            color: automation.enabled ? "var(--success)" : "var(--text-muted)",
          }}
        >
          <CircleCheck size={13} />
          {automation.enabled ? "Active" : "Paused"}
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button
            onClick={() => router.push(`/automations/edit/${automation.id}?instagramAccountId=${selectedAccountId}`)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "all var(--duration) var(--ease)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            <Pencil size={12} />
            Edit
          </button>
          <Popconfirm
            title="Delete this automation?"
            description="This action cannot be undone."
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={onDelete}
          >
            <button
              disabled={isDeleting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-muted)",
                cursor: isDeleting ? "wait" : "pointer",
                transition: "all var(--duration) var(--ease)",
                opacity: isDeleting ? 0.5 : 1,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--danger)"; e.currentTarget.style.color = "var(--danger)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              <Trash2 size={12} />
            </button>
          </Popconfirm>
        </div>
      </div>
    </div>
  );
}

/* ── Empty Automations ── */
function EmptyAutomations({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-14) var(--space-6)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "var(--radius-lg)",
          background: "var(--hover-bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "var(--space-5)",
        }}
      >
        <Bot size={24} color="var(--primary)" />
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 var(--space-2) 0" }}>
        No automations yet
      </h3>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 var(--space-6) 0", maxWidth: 380, lineHeight: 1.6 }}>
        Create your first automation workflow to start responding to DMs, comments, and story interactions automatically.
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
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          transition: "all var(--duration) var(--ease)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--primary)"; }}
      >
        <Plus size={16} />
        Create Automation
      </button>
    </div>
  );
}

/* ── Main Content ── */
function AutomationsContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const { data: statusData, isLoading: accountsLoading, error: accountsError } = useQuery({
    queryKey: ["meta-status"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/meta/status`);
      if (!response.ok) throw new Error("Failed to fetch connection status");
      return response.json() as Promise<{ accounts: InstagramAccount[] }>;
    },
  });

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
      messageApi.success("Status updated.");
      queryClient.invalidateQueries({ queryKey: ["automations", selectedAccountId] });
    },
    onError: (err: Error) => messageApi.error(err.message),
  });

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

  if (accountsLoading) return <AppShell><AutomationsSkeleton /></AppShell>;
  if (accountsError) return (
    <AppShell>
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
        Unable to connect to backend. Ensure the API server is running on port 3001.
      </div>
    </AppShell>
  );
  if (accountsList.length === 0) return (
    <AppShell>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--space-14)", textAlign: "center" }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 var(--space-2)" }}>No accounts connected</h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 var(--space-6)" }}>Connect an Instagram Business account to create automations.</p>
        <button
          onClick={() => router.push("/")}
          style={{ padding: "10px 20px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
        >
          Go to Connections
        </button>
      </div>
    </AppShell>
  );

  return (
    <AppShell>
      {contextHolder}

      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "var(--space-8)" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Automations
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "var(--space-1) 0 0" }}>
            {selectedAccount ? (
              <>
                Workflows for{" "}
                <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{selectedAccount.pageName}</span>
                {accountsList.length > 1 && (
                  <select
                    value={selectedAccountId || ""}
                    onChange={(e) => handleAccountChange(e.target.value)}
                    style={{
                      marginLeft: "var(--space-2)",
                      padding: "2px 6px",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      background: "var(--surface)",
                      cursor: "pointer",
                    }}
                  >
                    {accountsList.map((acc) => (
                      <option key={acc.id} value={acc.id}>{acc.pageName}</option>
                    ))}
                  </select>
                )}
              </>
            ) : (
              "Select an account to view workflows."
            )}
          </p>
        </div>
        <button
          onClick={() => router.push(`/automations/create?instagramAccountId=${selectedAccountId}`)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "10px 20px",
            background: "var(--primary)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all var(--duration) var(--ease)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--primary)"; }}
        >
          <Plus size={16} />
          Create Automation
        </button>
      </div>

      {/* Content */}
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
          Error loading automations. Check backend connection.
        </div>
      ) : !automationsData?.length ? (
        <EmptyAutomations onCreateClick={() => router.push(`/automations/create?instagramAccountId=${selectedAccountId}`)} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "var(--space-4)" }}>
          {automationsData.map((auto: any) => (
            <WorkflowCard
              key={auto.id}
              automation={auto}
              selectedAccountId={selectedAccountId || ""}
              onToggle={(val) => toggleMutation.mutate({ id: auto.id, enabled: val })}
              onDelete={() => deleteMutation.mutate(auto.id)}
              isToggling={toggleMutation.isPending && (toggleMutation.variables as any)?.id === auto.id}
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
