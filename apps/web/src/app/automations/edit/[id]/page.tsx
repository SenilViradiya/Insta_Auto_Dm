"use client";

import React, { Suspense } from "react";
import { message } from "antd";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Instagram, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { AutomationDraft } from "../../../../components/builder/types";
import AppShell from "../../../../components/layout/AppShell";

function BuilderSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Top panel skeleton */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "var(--space-4)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", width: "60%" }}>
          <div style={{ width: "30%", height: "24px" }} className="skeleton" />
          <div style={{ width: "50%", height: "12px", marginTop: "4px" }} className="skeleton" />
        </div>
        <div style={{ width: "120px", height: "36px", borderRadius: "var(--radius-md)" }} className="skeleton" />
      </div>

      {/* Main split canvas */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr", gap: "var(--space-6)" }}>
        {/* Left config form card */}
        <div style={{ padding: "var(--space-5)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", background: "var(--surface)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div style={{ width: "40%", height: "16px" }} className="skeleton" />
          <div style={{ width: "100%", height: "40px" }} className="skeleton" />
          <div style={{ width: "100%", height: "60px" }} className="skeleton" />
          <div style={{ width: "100%", height: "40px" }} className="skeleton" />
        </div>

        {/* Right canvas card */}
        <div style={{ padding: "var(--space-6)", border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)", background: "var(--surface-secondary)", minHeight: "360px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "var(--space-5)" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "50%" }} className="skeleton" />
          <div style={{ width: "180px", height: "16px" }} className="skeleton" />
          <div style={{ width: "130px", height: "12px" }} className="skeleton" />
        </div>
      </div>
    </div>
  );
}

const AutomationBuilder = dynamic(
  () => import("../../../../components/builder/AutomationBuilder"),
  {
    ssr: false,
    loading: () => <BuilderSkeleton />,
  }
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function EditAutomationContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const [messageApi, contextHolder] = message.useMessage();

  // Retrieve active selected account from query or localStorage
  const activeAccountId =
    searchParams.get("instagramAccountId") ||
    localStorage.getItem("selected_instagram_account_id") ||
    "default";

  // Fetch accounts list to display the details of the locked account context
  const { data: statusData } = useQuery({
    queryKey: ["meta-status"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/meta/status`);
      if (!response.ok) {
        throw new Error("Failed to fetch connection status");
      }
      return response.json() as Promise<{ accounts: Array<{ id: string; instagramUserId: string; pageName: string }> }>;
    },
  });

  const activeAccount = statusData?.accounts?.find(
    (acc) => acc.id === activeAccountId
  );

  // Fetch existing details
  const { data: automationData, isLoading, error } = useQuery({
    queryKey: ["automation", id],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/automations/${id}`);
      if (!response.ok) {
        throw new Error("Failed to load automation details");
      }
      return response.json();
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (draft: AutomationDraft) => {
      const payload = {
        name: draft.metadata.name,
        triggerType: draft.trigger.type,
        triggerConfig: draft.trigger.config,
        conditions: draft.conditions,
        actions: draft.actions,
      };

      const response = await fetch(`${API_URL}/automations/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-instagram-account-id": activeAccountId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to update automation flow. Verify your configuration settings.");
      }

      return response.json();
    },
    onSuccess: () => {
      messageApi.success("Automation flow updated successfully!");
      setTimeout(() => {
        router.push("/automations");
      }, 1000);
    },
    onError: (err: any) => {
      messageApi.error(err.message || "Failed to update flow");
    },
  });

  const handleSave = async (draft: AutomationDraft) => {
    await updateMutation.mutateAsync(draft);
  };

  if (isLoading) {
    return (
      <AppShell>
        <BuilderSkeleton />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
            padding: "var(--space-5)",
            background: "var(--danger-bg)",
            border: "1px solid rgba(220, 38, 38, 0.15)",
            borderRadius: "var(--radius-lg)",
            color: "var(--danger)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 600, fontSize: "14px" }}>Failed to Load Automation Details</span>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>
            The requested automation flow could not be loaded. Please verify the ID parameter in the URL and ensure the API server is up and reachable.
          </p>
          <button
            onClick={() => router.push("/automations")}
            style={{
              width: "fit-content",
              marginTop: "var(--space-2)",
              padding: "6px 14px",
              background: "var(--danger)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "background var(--duration) var(--ease)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#B91C1C"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--danger)"; }}
          >
            Return to List
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {contextHolder}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        {/* Header toolbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
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
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-secondary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface)"; }}
              aria-label="Return to automations list"
              type="button"
            >
              <ArrowLeft size={16} />
            </button>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
              Edit Automation Flow
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
              Scope: {activeAccount.pageName}
            </div>
          )}
        </div>

        <AutomationBuilder
          instagramAccountId={activeAccountId}
          activeAccountName={activeAccount?.pageName || "Default Account"}
          initialData={automationData}
          onSave={handleSave}
          isSaving={updateMutation.isPending}
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
      <EditAutomationContent />
    </Suspense>
  );
}
