"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, HelpCircle, Layers, ArrowRight } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import AssetLibrary from "../../components/assets/AssetLibrary";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface InstagramAccount {
  id: string;
  instagramUserId: string;
  username: string;
  connectedAt: string;
}

export default function AssetsPage() {
  const router = useRouter();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  // Fetch connection accounts
  const {
    data: statusData,
    isLoading: accountsLoading,
    error: accountsError,
  } = useQuery({
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

  const handleAccountChange = (val: string) => {
    setSelectedAccountId(val);
    localStorage.setItem("selected_instagram_account_id", val);
  };

  const accountsList = statusData?.accounts || [];
  const selectedAccount = accountsList.find(
    (acc) => acc.id === selectedAccountId,
  );

  // Loading skeleton state
  if (accountsLoading) {
    return (
      <AppShell>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-6)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{ width: "40%", height: "28px" }}
              className="skeleton"
            />
            <div
              style={{ width: "20%", height: "35px" }}
              className="skeleton"
            />
          </div>
          <div style={{ height: "45px" }} className="skeleton" />
          <div style={{ height: "320px" }} className="skeleton" />
        </div>
      </AppShell>
    );
  }

  // Connection failure indicator
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
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              API Server Connection Loss
            </span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Unable to reach NestJS API at {API_URL}. Check if database and
              docker services are online.
            </span>
          </div>
        </div>
      </AppShell>
    );
  }

  // Account missing warning
  if (accountsList.length === 0) {
    return (
      <AppShell>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-14)",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: 20,
              fontWeight: 650,
              color: "var(--text-primary)",
              margin: "0 0 8px 0",
            }}
          >
            No linked accounts found
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              margin: "0 0 var(--space-6) 0",
              maxWidth: 360,
            }}
          >
            Connect an Instagram Business profile connection first to browse
            assets.
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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-6)",
        }}
      >
        {/* Header Block with switcher */}
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
              <Layers size={22} color="var(--primary)" />
              Asset Library
            </h1>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                margin: "4px 0 0 0",
              }}
            >
              Manage, sync, and inspect Instagram Reels, carousel posts,
              comments, and metrics.
            </p>
          </div>

          {/* Active Workspace Badge indicator */}
          {selectedAccount && (
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
                  {selectedAccount.username}
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* Informational banner */}
        <div
          style={{
            background: "var(--surface-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <HelpCircle
            size={15}
            color="var(--primary)"
            style={{ flexShrink: 0 }}
          />
          <p
            style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}
          >
            Double-click any media cards to see detailed information, estimated
            reach, and direct links inside the Creator Studio detail panel.
          </p>
        </div>

        {/* Selected account warning context */}
        {selectedAccountId ? (
          <AssetLibrary
            instagramAccountId={selectedAccountId}
            selectedMediaId=""
            onSelectMedia={() => { }} // No-op selector callback for active view mode
          />
        ) : (
          <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
            Select an account to load assets.
          </div>
        )}
      </div>
    </AppShell>
  );
}
