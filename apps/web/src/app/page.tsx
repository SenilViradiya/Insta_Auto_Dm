"use client";

import React, { Suspense, useEffect } from "react";
import { message } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Link2,
  ExternalLink,
  Unplug,
  Plus,
  CircleCheck,
  AlertCircle,
  Instagram,
} from "lucide-react";
import AppShell from "../components/layout/AppShell";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface InstagramAccount {
  id: string;
  instagramUserId: string;
  pageId: string;
  pageName: string;
  connectedAt: string;
}

/* ── Skeleton Loader ── */
function ConnectionsSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="skeleton skeleton-title" style={{ width: 200 }} />
          <div className="skeleton skeleton-text" style={{ width: 340 }} />
        </div>
        <div className="skeleton" style={{ width: 160, height: 40, borderRadius: "var(--radius-md)" }} />
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="skeleton skeleton-card" style={{ height: 72 }} />
      ))}
    </div>
  );
}

/* ── Empty State ── */
function EmptyState({ onConnect }: { onConnect: () => void }) {
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
        <Link2 size={24} color="var(--primary)" />
      </div>
      <h3
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: "var(--text-primary)",
          margin: "0 0 var(--space-2) 0",
        }}
      >
        No accounts connected
      </h3>
      <p
        style={{
          fontSize: 14,
          color: "var(--text-secondary)",
          margin: "0 0 var(--space-6) 0",
          maxWidth: 380,
          lineHeight: 1.6,
        }}
      >
        Connect an Instagram Business account to start building automations and managing direct messages.
      </p>
      <button
        onClick={onConnect}
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
        Connect Instagram
      </button>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: "var(--space-4)" }}>
        Requires a Facebook Page linked to an Instagram Business Profile
      </p>
    </div>
  );
}

/* ── Account Row ── */
function AccountRow({
  account,
  onDisconnect,
  isDisconnecting,
}: {
  account: InstagramAccount;
  onDisconnect: () => void;
  isDisconnecting: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--space-4) var(--space-6)",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        transition: "all var(--duration) var(--ease)",
      }}
      className="card-interactive"
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
        {/* Avatar/Icon */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, #833AB4, #E1306C, #F77737)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Instagram size={20} color="#fff" />
        </div>

        {/* Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
            {account.pageName}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <code
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                background: "var(--surface-secondary)",
                padding: "1px 6px",
                borderRadius: "var(--radius-sm)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {account.instagramUserId}
            </code>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Connected {new Date(account.connectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
        {/* Status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-1)",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--success)",
          }}
        >
          <CircleCheck size={14} />
          Active
        </div>

        {/* Disconnect */}
        <button
          onClick={(e) => { e.stopPropagation(); onDisconnect(); }}
          disabled={isDisconnecting}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-1)",
            padding: "6px 12px",
            background: "transparent",
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
            fontWeight: 500,
            cursor: isDisconnecting ? "wait" : "pointer",
            transition: "all var(--duration) var(--ease)",
            opacity: isDisconnecting ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--danger)";
            e.currentTarget.style.color = "var(--danger)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.color = "var(--text-muted)";
          }}
          aria-label={`Disconnect ${account.pageName}`}
        >
          <Unplug size={14} />
          {isDisconnecting ? "Disconnecting…" : "Disconnect"}
        </button>
      </div>
    </div>
  );
}

/* ── Main Content ── */
function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const connectedParam = searchParams.get("connected");
  const errorParam = searchParams.get("error");
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (connectedParam === "true") {
      messageApi.success("Instagram Business account connected successfully.");
      router.replace("/");
    } else if (errorParam) {
      messageApi.error(`Connection failed: ${decodeURIComponent(errorParam)}`);
      router.replace("/");
    }
  }, [connectedParam, errorParam, router, messageApi]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["meta-status"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/meta/status`);
      if (!response.ok) throw new Error("Failed to fetch connection status");
      return response.json() as Promise<{ accounts: InstagramAccount[] }>;
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_URL}/meta/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Failed to disconnect account");
      return response.json();
    },
    onSuccess: () => {
      messageApi.success("Account disconnected.");
      queryClient.invalidateQueries({ queryKey: ["meta-status"] });
    },
    onError: (err: Error) => {
      messageApi.error(err.message || "Disconnect failed");
    },
  });

  const handleConnect = () => {
    window.location.href = `${API_URL}/meta/login`;
  };

  return (
    <AppShell>
      {contextHolder}

      {/* Page Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-8)",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Connections
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              margin: "var(--space-1) 0 0 0",
            }}
          >
            Manage linked Instagram Business accounts for automation.
          </p>
        </div>

        <button
          onClick={handleConnect}
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
          Connect Account
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <ConnectionsSkeleton />
      ) : error ? (
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
      ) : !data?.accounts?.length ? (
        <EmptyState onConnect={handleConnect} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              padding: "0 var(--space-2)",
              marginBottom: "var(--space-1)",
            }}
          >
            <CircleCheck size={14} color="var(--success)" />
            {data.accounts.length} active {data.accounts.length === 1 ? "connection" : "connections"}
          </div>

          {data.accounts.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              onDisconnect={() => disconnectMutation.mutate(account.id)}
              isDisconnecting={
                disconnectMutation.isPending && disconnectMutation.variables === account.id
              }
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <ConnectionsSkeleton />
        </AppShell>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
