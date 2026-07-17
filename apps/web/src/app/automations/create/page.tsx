"use client";

import React, { Suspense, useEffect } from "react";
import { message } from "antd";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Instagram } from "lucide-react";
import dynamic from "next/dynamic";
import { AutomationDraft } from "../../../components/builder/types";
import { useBuilderStore } from "../../../components/builder/builder.store";
import AppShell from "../../../components/layout/AppShell";

function BuilderSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
    >
      {/* Top panel skeleton */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "var(--space-4)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
            width: "60%",
          }}
        >
          <div style={{ width: "30%", height: "24px" }} className="skeleton" />
          <div
            style={{ width: "50%", height: "12px", marginTop: "4px" }}
            className="skeleton"
          />
        </div>
        <div
          style={{
            width: "120px",
            height: "36px",
            borderRadius: "var(--radius-md)",
          }}
          className="skeleton"
        />
      </div>

      {/* Main split canvas */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 2fr",
          gap: "var(--space-6)",
        }}
      >
        {/* Left config form card */}
        <div
          style={{
            padding: "var(--space-5)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            background: "var(--surface)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          <div style={{ width: "40%", height: "16px" }} className="skeleton" />
          <div style={{ width: "100%", height: "40px" }} className="skeleton" />
          <div style={{ width: "100%", height: "60px" }} className="skeleton" />
          <div style={{ width: "100%", height: "40px" }} className="skeleton" />
        </div>

        {/* Right canvas card */}
        <div
          style={{
            padding: "var(--space-6)",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius-lg)",
            background: "var(--surface-secondary)",
            minHeight: "360px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-5)",
          }}
        >
          <div
            style={{ width: "56px", height: "56px", borderRadius: "50%" }}
            className="skeleton"
          />
          <div
            style={{ width: "180px", height: "16px" }}
            className="skeleton"
          />
          <div
            style={{ width: "130px", height: "12px" }}
            className="skeleton"
          />
        </div>
      </div>
    </div>
  );
}

const AutomationBuilder = dynamic(
  () => import("../../../components/builder/AutomationBuilder"),
  {
    ssr: false,
    loading: () => <BuilderSkeleton />,
  },
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function CreateAutomationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messageApi, contextHolder] = message.useMessage();
  const resetDraft = useBuilderStore((state) => state.resetDraft);

  useEffect(() => {
    resetDraft();
  }, [resetDraft]);

  // Retrieve selected account from query or localStorage
  const activeAccountId =
    searchParams.get("instagramAccountId") ||
    localStorage.getItem("selected_instagram_account_id") ||
    "default";

  // Fetch accounts list to display active scope name
  const { data: statusData } = useQuery({
    queryKey: ["meta-status"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/meta/status`);
      if (!response.ok) {
        throw new Error("Failed to fetch connection status");
      }
      return response.json() as Promise<{
        accounts: Array<{
          id: string;
          instagramUserId: string;
          username: string;
        }>;
      }>;
    },
  });

  const activeAccount = statusData?.accounts?.find(
    (acc) => acc.id === activeAccountId,
  );

  const saveMutation = useMutation({
    mutationFn: async (draft: AutomationDraft) => {
      const payload = {
        name: draft.metadata.name,
        enabled: true,
        triggerType: draft.trigger.type,
        triggerConfig: draft.trigger.config,
        conditions: draft.conditions,
        actions: draft.actions,
      };

      const response = await fetch(`${API_URL}/automations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-instagram-account-id": activeAccountId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          "Failed to create automation flow. Make sure trigger configuration is valid.",
        );
      }

      return response.json();
    },
    onSuccess: () => {
      messageApi.success("Automation flow created successfully!");
      setTimeout(() => {
        router.push("/automations");
      }, 1000);
    },
    onError: (err: any) => {
      messageApi.error(err.message || "Failed to create flow");
    },
  });

  const handleSave = async (draft: AutomationDraft) => {
    await saveMutation.mutateAsync(draft);
  };

  return (
    <AppShell>
      {contextHolder}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-6)",
        }}
      >
        {/* Header toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
            }}
          >
            <button
              onClick={() => router.push("/automations")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                color: "var(--text-secondary)",
                transition: "all var(--duration) var(--ease)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--surface-secondary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--surface)";
              }}
              aria-label="Return to automations list"
              type="button"
            >
              <ArrowLeft size={16} />
            </button>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Create Automation Flow
            </h1>
          </div>

          {activeAccount && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                background: "var(--hover-bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 650,
                color: "var(--primary)",
              }}
            >
              <Instagram size={14} />
              Scope: {activeAccount.username}
            </div>
          )}
        </div>

        <AutomationBuilder
          instagramAccountId={activeAccountId}
          activeAccountName={activeAccount?.username || "Default Account"}
          onSave={handleSave}
          isSaving={saveMutation.isPending}
        />
      </div>
    </AppShell>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <BuilderSkeleton />
        </AppShell>
      }
    >
      <CreateAutomationContent />
    </Suspense>
  );
}
