"use client";

import React, { Suspense } from "react";
import { Layout, Button, Typography, Spin, Alert, message } from "antd";
import { LeftOutlined, ThunderboltOutlined, LoadingOutlined, InstagramOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AutomationDraft } from "../../../../components/builder/types";

const AutomationBuilder = dynamic(
  () => import("../../../../components/builder/AutomationBuilder"),
  {
    ssr: false,
    loading: () => <Spin size="large" className="py-20 flex justify-center w-full" />,
  }
);

const { Header, Content } = Layout;
const { Title, Text } = Typography;

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
      return response.json() as Promise<{ accounts: Array<{ instagramUserId: string; pageName: string }> }>;
    },
  });

  const activeAccount = statusData?.accounts?.find(
    (acc) => acc.instagramUserId === activeAccountId
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
      <Layout className="min-h-screen bg-slate-50">
        <div className="py-40 flex flex-col items-center justify-center gap-3">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
          <Text type="secondary">Loading automation details...</Text>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout className="min-h-screen bg-slate-50">
        <Content className="p-8 max-w-3xl mx-auto w-full">
          <Alert
            message="Error"
            description="Failed to load automation details. Check the ID parameter and verify connection to NestJS."
            type="error"
            showIcon
            action={
              <Button
                size="small"
                type="primary"
                onClick={() => router.push("/automations")}
              >
                Return to List
              </Button>
            }
          />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout className="min-h-screen bg-slate-50">
      {contextHolder}
      <Header className="bg-white border-b border-slate-200 px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-red-500 to-indigo-600 flex items-center justify-center">
            <ThunderboltOutlined className="text-white text-xl" />
          </div>
          <Title
            level={4}
            style={{ margin: 0, fontWeight: 800 }}
            className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent"
          >
            InstaDM Manager
          </Title>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-semibold text-slate-500 hover:text-slate-800 transition py-5 text-sm"
          >
            Connections
          </Link>
          <Link
            href="/automations"
            className="font-semibold text-slate-900 border-b-2 border-indigo-600 py-5 text-sm"
          >
            Automations
          </Link>
        </div>
      </Header>

      <Content className="p-8 max-w-4xl mx-auto w-full flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="text"
              icon={<LeftOutlined />}
              onClick={() => router.push("/automations")}
            />
            <Title level={3} style={{ margin: 0 }}>
              Edit Automation Flow
            </Title>
          </div>

          {activeAccount && (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2">
              <InstagramOutlined className="text-indigo-650" />
              <span className="text-xs font-bold text-indigo-750">
                Scope: {activeAccount.pageName}
              </span>
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
      </Content>
    </Layout>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Spin size="large" />
        </div>
      }
    >
      <EditAutomationContent />
    </Suspense>
  );
}
