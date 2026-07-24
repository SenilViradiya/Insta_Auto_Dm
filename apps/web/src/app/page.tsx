"use client";

import React, { Suspense, useEffect, useState } from "react";
import { message } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { Link2, Plus, AlertCircle, Database } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import {
  WorkspaceHeader,
  ConnectionHealth,
  PermissionHealth,
  SyncStatus,
  WorkspaceLoadingSkeleton,
  PermissionStatus,
} from "../components/workspace/WorkspaceComponents";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface InstagramAccount {
  id: string;
  instagramUserId: string;
  username: string;
  connectedAt: string;
  tokenExpiresAt?: string | null;
}

interface InstagramProfile {
  id: string;
  instagramAccountId: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
  followers: number;
  following: number;
  mediaCount: number;
  biography?: string;
  website?: string;
  lastSyncedAt?: string;
}

/* ── Custom Onboarding Empty State ── */
function EmptyState({ onConnect }: { onConnect: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "56px 24px",
        textAlign: "center",
        background: "var(--surface)",
        border: "1px dashed var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
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
          marginBottom: "20px",
        }}
      >
        <Link2 size={24} color="var(--primary)" />
      </div>
      <h3
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: "var(--text-primary)",
          margin: "0 0 8px 0",
        }}
      >
        No Instagram Workspaces found
      </h3>
      <p
        style={{
          fontSize: 14,
          color: "var(--text-secondary)",
          margin: "0 0 24px 0",
          maxWidth: 420,
          lineHeight: 1.6,
        }}
      >
        Welcome! Connect your business Instagram professional profiles. Once
        connected, Flow mint will auto-monitor webhook feeds, evaluate Keyword
        Conditions and auto-reply to DMs.
      </p>
      <button
        onClick={onConnect}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 20px",
          background: "var(--primary)",
          color: "#fff",
          border: "none",
          borderRadius: "var(--radius-md)",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all var(--duration) var(--ease)",
          boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--primary-hover)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--primary)";
        }}
      >
        <Plus size={16} />
        Connect Instagram Account
      </button>
    </div>
  );
}

/* ── Main Workspace Content Panel ── */
function WorkspaceDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const connectedParam = searchParams.get("connected");
  const errorParam = searchParams.get("error");
  const [messageApi, contextHolder] = message.useMessage();
  const toastShownRef = React.useRef(false);

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (toastShownRef.current) return;

    if (connectedParam === "true") {
      toastShownRef.current = true;
      messageApi.success("Instagram Business account connected successfully.");
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("connected");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
      router.replace("/");
    } else if (errorParam) {
      toastShownRef.current = true;
      messageApi.error(`Connection failed: ${decodeURIComponent(errorParam)}`);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("error");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
      router.replace("/");
    }
  }, [connectedParam, errorParam, router, messageApi]);

  // Query: Accounts Status List
  const { data, isLoading, error } = useQuery({
    queryKey: ["meta-status"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/meta/status`);
      if (!response.ok) throw new Error("Failed to fetch connection status");
      return response.json() as Promise<{ accounts: InstagramAccount[] }>;
    },
  });

  // Query: Permissions Status Verification
  const { data: permissionsData, isLoading: isPermissionsLoading } = useQuery({
    queryKey: ["permissions-check", selectedAccountId],
    queryFn: async () => {
      if (!selectedAccountId) return null;
      const response = await fetch(
        `${API_URL}/meta/permissions?accountId=${selectedAccountId}`
      );
      if (!response.ok) throw new Error("Failed to fetch permissions status");
      return response.json() as Promise<PermissionStatus>;
    },
    enabled: !!selectedAccountId,
  });

  // Sync selected account state from local storage or pick first
  useEffect(() => {
    if (data?.accounts && data.accounts.length > 0) {
      const saved = localStorage.getItem("selected_instagram_account_id");
      const exactMatch = data.accounts.find((acc) => acc.id === saved);
      if (saved && exactMatch) {
        setSelectedAccountId(saved);
        return;
      }
      setSelectedAccountId(data.accounts[0].id);
    } else {
      setSelectedAccountId(null);
    }
  }, [data]);

  const activeAccount =
    data?.accounts.find((e) => e.id === selectedAccountId) || null;

  // Query: Fetch Synced Instagram Profile from API
  const {
    data: profile,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["profile-details", selectedAccountId],
    queryFn: async () => {
      if (!selectedAccountId) return null;
      try {
        const response = await fetch(`${API_URL}/profile`, {
          headers: { "x-instagram-account-id": selectedAccountId },
        });
        if (!response.ok) {
          // Profile row might not have synced yet, return null so UI handles fallback gracefully
          return null;
        }
        return response.json() as Promise<InstagramProfile>;
      } catch {
        return null;
      }
    },
    enabled: !!selectedAccountId,
  });

  // Mutation: Trigger Sync Now
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAccountId) return;
      const response = await fetch(`${API_URL}/assets/sync`, {
        method: "POST",
        headers: {
          "x-instagram-account-id": selectedAccountId,
        },
      });
      if (!response.ok) throw new Error("Sync failed");
      return response.json();
    },
    onSuccess: () => {
      messageApi.success("Workspace assets sync complete.");
      refetchProfile();
      queryClient.invalidateQueries({ queryKey: ["analytics-assets"] });
      queryClient.invalidateQueries({ queryKey: ["assets-list"] });
    },
    onError: (err: Error) => {
      messageApi.error(`Sync error: ${err.message}`);
    },
  });

  // Mutation: Disconnect Account
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
      messageApi.success("Instagram workspace detached.");
      localStorage.removeItem("selected_instagram_account_id");
      queryClient.invalidateQueries({ queryKey: ["meta-status"] });
    },
    onError: (err: Error) => {
      messageApi.error(err.message || "Disconnect failed");
    },
  });

  const handleConnect = () => {
    window.location.href = `${API_URL}/meta/login`;
  };

  const handleDisconnect = () => {
    if (selectedAccountId) {
      if (
        confirm(
          "Disconnect this Instagram account? All configured automations will stop executing.",
        )
      ) {
        disconnectMutation.mutate(selectedAccountId);
      }
    }
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
          marginBottom: "var(--space-6)",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "var(--space-4)",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Workspace Management
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              margin: "4px 0 0 0",
            }}
          >
            Configure connected Instagram Professional Accounts, audit security permission
            statuses, and synchronize library assets.
          </p>
        </div>

        <button
          onClick={handleConnect}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "8px 16px",
            background: "var(--primary)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all var(--duration) var(--ease)",
            boxShadow: "0 2px 4px rgba(37,99,235,0.15)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--primary-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--primary)";
          }}
        >
          <Plus size={15} />
          Link New Business Account
        </button>
      </div>

      {/* Main Panel View */}
      {isLoading ? (
        <WorkspaceLoadingSkeleton />
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
          Unable to synchronize with local cluster database. Verify NestJS
          server is running on port 3001.
        </div>
      ) : !data?.accounts?.length ? (
        <EmptyState onConnect={handleConnect} />
      ) : activeAccount ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Main Account details header */}
          <WorkspaceHeader
            account={activeAccount}
            profile={profile || null}
            onDisconnect={handleDisconnect}
            isDisconnecting={disconnectMutation.isPending}
            onSyncNow={() => syncMutation.mutate()}
            isSyncing={syncMutation.isPending}
            onReconnect={handleConnect}
          />

          {/* Three column layout for details cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "20px",
            }}
          >
            <ConnectionHealth
              account={activeAccount}
              permissions={permissionsData || null}
              isLoading={isPermissionsLoading}
            />
            <PermissionHealth
              permissions={permissionsData || null}
              isLoading={isPermissionsLoading}
            />
            <SyncStatus
              profile={profile || null}
              onSyncNow={() => syncMutation.mutate()}
              isSyncing={syncMutation.isPending}
            />
          </div>
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <Database
            size={32}
            color="var(--text-muted)"
            style={{ marginBottom: "12px" }}
          />
          <h4 style={{ margin: 0, color: "var(--text-primary)" }}>
            No selected account workspace active
          </h4>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Choose an Instagram page from the top switcher to start managing.
          </p>
        </div>
      )}
    </AppShell>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <WorkspaceLoadingSkeleton />
        </AppShell>
      }
    >
      <WorkspaceDashboardContent />
    </Suspense>
  );
}
