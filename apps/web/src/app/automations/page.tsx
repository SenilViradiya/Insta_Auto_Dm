"use client";

import React, { Suspense, useEffect, useState } from "react";
import {
  Layout,
  Button,
  Card,
  Table,
  Switch,
  Badge,
  Typography,
  Space,
  Alert,
  Spin,
  message,
  Popconfirm,
  Select,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  LoadingOutlined,
  ThunderboltOutlined,
  InstagramOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mapBackendToFrontend } from "./mapping-utils";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Keyword {
  id?: string;
  keyword: string;
  matchType: "EXACT" | "CONTAINS" | "STARTS_WITH";
}

interface Action {
  id?: string;
  message: string;
  delaySeconds: number;
}

interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  createdAt: string;
  keywords: Keyword[];
  actions: Action[];
}

interface InstagramAccount {
  id: string;
  instagramUserId: string;
  pageId: string;
  pageName: string;
  connectedAt: string;
}

function AutomationsContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // 1. Query connected accounts dynamically
  const { data: statusData, isLoading: accountsLoading, error: accountsError } = useQuery({
    queryKey: ["meta-status"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/meta/status`);
      if (!response.ok) {
        throw new Error("Failed to fetch connection status from API");
      }
      return response.json() as Promise<{ accounts: InstagramAccount[] }>;
    },
  });

  // 2. Synchronize selected account with state and localStorage
  useEffect(() => {
    if (statusData?.accounts && statusData.accounts.length > 0) {
      const saved = localStorage.getItem("selected_instagram_account_id");
      const exists = statusData.accounts.some((acc) => acc.instagramUserId === saved);
      if (saved && exists) {
        setSelectedAccountId(saved);
      } else {
        const firstId = statusData.accounts[0].instagramUserId;
        setSelectedAccountId(firstId);
        localStorage.setItem("selected_instagram_account_id", firstId);
      }
    } else {
      setSelectedAccountId(null);
    }
  }, [statusData]);

  const handleAccountChange = (val: string) => {
    setSelectedAccountId(val);
    localStorage.setItem("selected_instagram_account_id", val);
  };

  // 3. Query automations scoped to selectedAccountId
  const { data: automationsData, isLoading: automationsLoading, error: automationsError } = useQuery({
    queryKey: ["automations", selectedAccountId],
    queryFn: async () => {
      if (!selectedAccountId) return [] as Automation[];
      const response = await fetch(`${API_URL}/automations`, {
        headers: {
          "x-instagram-account-id": selectedAccountId,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch automations list");
      }
      const json = await response.json();
      const items = json && Array.isArray(json.items) ? json.items : [];
      return items.map(mapBackendToFrontend) as Automation[];
    },
    enabled: !!selectedAccountId,
  });

  // Toggle switch enabled/disabled
  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const response = await fetch(`${API_URL}/automations/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-instagram-account-id": selectedAccountId || "default",
        },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) {
        throw new Error("Failed to update status");
      }
      return response.json();
    },
    onSuccess: () => {
      messageApi.success("Automation status updated.");
      queryClient.invalidateQueries({ queryKey: ["automations", selectedAccountId] });
    },
    onError: (err: Error) => {
      messageApi.error(err.message || "Failed to update status");
    },
  });

  // Delete automation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_URL}/automations/${id}`, {
        method: "DELETE",
        headers: {
          "x-instagram-account-id": selectedAccountId || "default",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to delete automation");
      }
      return response.json();
    },
    onSuccess: () => {
      messageApi.success("Automation deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["automations", selectedAccountId] });
    },
    onError: (err: Error) => {
      messageApi.error(err.message || "Failed to delete automation");
    },
  });

  const columns = [
    {
      title: "Flow Name",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: Automation) => (
        <Space direction="vertical" size={0}>
          <span className="font-bold text-slate-800 text-base">{text}</span>
          {record.createdAt && (
            <Text type="secondary" className="text-xs">
              Created: {new Date(record.createdAt).toLocaleDateString()}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Keywords & Triggers",
      dataIndex: "keywords",
      key: "keywords",
      render: (keywords: Keyword[]) => {
        const list = Array.isArray(keywords) ? keywords : [];
        if (list.length === 0) return <Text type="secondary" className="text-xs">No keywords</Text>;
        return (
          <div className="flex flex-wrap gap-2 max-w-sm">
            {list.map((kw, idx) => {
              if (!kw || !kw.keyword) return null;
              let color = "blue";
              if (kw.matchType === "EXACT") color = "purple";
              if (kw.matchType === "STARTS_WITH") color = "cyan";
              return (
                <Badge
                  key={kw.id || idx}
                  count={`${kw.keyword} (${(kw.matchType || "exact").toLowerCase()})`}
                  style={{ backgroundColor: color, color: "#fff" }}
                />
              );
            })}
          </div>
        );
      },
    },
    {
      title: "DM Responses & Actions",
      dataIndex: "actions",
      key: "actions",
      render: (actions: Action[]) => {
        const list = Array.isArray(actions) ? actions : [];
        if (list.length === 0) return <Text type="secondary" className="text-xs">No actions configured</Text>;
        return (
          <div className="flex flex-col gap-2 max-w-md">
            {list.map((act, idx) => {
              if (!act) return null;
              return (
                <div
                  key={act.id || idx}
                  className="flex flex-col gap-1 bg-slate-100 p-2.5 rounded-lg border border-slate-200"
                >
                  <Text className="italic text-xs font-semibold text-slate-500">
                    Message Content:
                  </Text>
                  <Text className="text-sm font-medium text-slate-800">
                    &ldquo;{act.message || "(Empty text message)"}&rdquo;
                  </Text>
                  {act.delaySeconds > 0 && (
                    <Badge
                      status="processing"
                      text={`Delay response: ${act.delaySeconds}s`}
                      className="mt-1"
                    />
                  )}
                </div>
              );
            })}
          </div>
        );
      },
    },
    {
      title: "Active",
      dataIndex: "enabled",
      key: "enabled",
      render: (enabled: boolean, record: Automation) => (
        <Switch
          checked={enabled}
          loading={
            toggleMutation.isPending &&
            toggleMutation.variables?.id === record.id
          }
          onChange={(val) =>
            toggleMutation.mutate({ id: record.id, enabled: val })
          }
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: Automation) => (
        <Space size="middle">
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => router.push(`/automations/edit/${record.id}?instagramAccountId=${selectedAccountId}`)}
          />
          <Popconfirm
            title="Are you sure you want to delete this automation?"
            okText="Yes"
            cancelText="No"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button
              danger
              type="primary"
              icon={<DeleteOutlined />}
              loading={
                deleteMutation.isPending &&
                deleteMutation.variables === record.id
              }
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Render Top Header
  const renderHeader = () => (
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
  );

  // Render Loading States
  if (accountsLoading) {
    return (
      <Layout className="min-h-screen bg-slate-50">
        {renderHeader()}
        <Content className="p-8 max-w-6xl mx-auto w-full flex flex-col items-center justify-center gap-3" style={{ minHeight: "70vh" }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
          <Text type="secondary" className="font-medium text-slate-500">
            Loading connected accounts...
          </Text>
        </Content>
      </Layout>
    );
  }

  // Render accounts fetch error
  if (accountsError) {
    return (
      <Layout className="min-h-screen bg-slate-50">
        {renderHeader()}
        <Content className="p-8 max-w-2xl mx-auto w-full" style={{ minHeight: "70vh", display: "flex", alignItems: "center" }}>
          <Alert
            message="Server Integration Error"
            description="Unable to connect to the backend server. Make sure the NestJS backend application is running on port 3001."
            type="error"
            showIcon
            className="w-full shadow-sm rounded-xl"
          />
        </Content>
      </Layout>
    );
  }

  const accountsList = statusData?.accounts || [];

  // Render Empty State (No accounts connected) - Task 4
  if (accountsList.length === 0) {
    return (
      <Layout className="min-h-screen bg-slate-50">
        {renderHeader()}
        <Content className="p-8 max-w-4xl mx-auto w-full flex items-center justify-center" style={{ minHeight: "75vh" }}>
          <Card variant={false} className="shadow-lg rounded-2xl p-8 max-w-lg text-center bg-white border border-slate-100">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
              <InstagramOutlined style={{ fontSize: 36 }} />
            </div>
            <Title level={3} className="text-slate-800 font-extrabold mb-3">
              No Instagram account connected.
            </Title>
            <Text type="secondary" style={{ display: "block", marginBottom: 30 }} className="text-base text-slate-500">
              To configure automations, you must first connect an active Instagram Business Profile linked to Facebook Page.
            </Text>
            <Button
              type="primary"
              size="large"
              icon={<InstagramOutlined />}
              className="bg-indigo-600 border-none font-bold hover:bg-indigo-700 h-12 px-8 rounded-xl shadow-md"
              onClick={() => router.push("/")}
            >
              Go to Connections Page
            </Button>
          </Card>
        </Content>
      </Layout>
    );
  }

  // Active Selected Instagram Profile Object Details - Task 5
  const selectedAccountDetails = accountsList.find(
    (acc) => acc.instagramUserId === selectedAccountId
  );

  return (
    <Layout className="min-h-screen bg-slate-50">
      {contextHolder}
      {renderHeader()}

      <Content className="p-8 max-w-6xl mx-auto w-full flex flex-col gap-8">
        {/* Account Selector + Profile Summary - Task 5 & 6 */}
        <Card variant={false} className="shadow-sm rounded-2xl bg-white border border-slate-100 p-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <InstagramOutlined style={{ fontSize: 24 }} />
              </div>
              <div className="flex flex-col">
                <Text type="secondary" className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Selected Instagram Profile
                </Text>
                <Select
                  value={selectedAccountId || undefined}
                  onChange={handleAccountChange}
                  dropdownClassName="rounded-xl shadow-lg border border-slate-100"
                  className="w-64 font-bold text-slate-800 text-lg border-none hover:border-none focus:outline-none"
                  variant={false}
                  placeholder="Select account"
                >
                  {accountsList.map((acc) => (
                    <Select.Option key={acc.instagramUserId} value={acc.instagramUserId}>
                      {acc.pageName || `ID: ${acc.instagramUserId}`}
                    </Select.Option>
                  ))}
                </Select>
              </div>
            </div>

            {selectedAccountDetails && (
              <div className="flex flex-wrap gap-x-6 gap-y-2 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-8">
                <div className="flex flex-col">
                  <Text className="text-xs font-medium text-slate-400">FB Page Name</Text>
                  <Text className="text-sm font-bold text-slate-700">{selectedAccountDetails.pageName}</Text>
                </div>
                <div className="flex flex-col">
                  <Text className="text-xs font-medium text-slate-400">Instagram Handle ID</Text>
                  <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono mt-0.5">
                    {selectedAccountDetails.instagramUserId}
                  </code>
                </div>
                <div className="flex flex-col">
                  <Text className="text-xs font-medium text-slate-400">Connected Date</Text>
                  <Text className="text-xs text-slate-500 font-medium mt-0.5">
                    {new Date(selectedAccountDetails.connectedAt).toLocaleDateString()}
                  </Text>
                </div>
                <div className="flex flex-col justify-center">
                  <Badge status="success" text={<Text className="text-xs font-semibold text-emerald-600">Active</Text>} />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Automations Table Action Bar */}
        <div className="flex items-center justify-between">
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 800 }} className="text-slate-800">
              Keyword Automations
            </Title>
            <Text type="secondary">
              Set automated responses to send whenever a user direct messages a configured keyword.
            </Text>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => router.push(`/automations/create?instagramAccountId=${selectedAccountId}`)}
            className="bg-indigo-600 border-none font-bold rounded-xl h-11 px-6 shadow-sm"
          >
            Create Automation
          </Button>
        </div>

        {/* Automations Table / Content Body - Task 4 */}
        {automationsLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
            <Text type="secondary">Retrieving keyword workflows...</Text>
          </div>
        ) : automationsError ? (
          <Alert
            message="Error"
            description="Unable to load automation data. Make sure the NestJS backend is running and connected."
            type="error"
            showIcon
            className="rounded-xl shadow-sm"
          />
        ) : (
          <Card variant={false} className="shadow-sm rounded-2xl bg-white border border-slate-100 overflow-hidden">
            <Table
              dataSource={automationsData}
              columns={columns}
              rowKey="id"
              locale={{
                emptyText: (
                  <div className="py-16 text-center">
                    <SettingOutlined className="text-4xl text-slate-300 mb-4" />
                    <Title level={4} className="text-slate-800">No Automations Found</Title>
                    <Text type="secondary" style={{ display: "block", marginBottom: 20 }}>
                      Control messages by creating a keyword flows template.
                    </Text>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => router.push(`/automations/create?instagramAccountId=${selectedAccountId}`)}
                      className="bg-indigo-600 border-none rounded-xl"
                    >
                      Connect your first flow
                    </Button>
                  </div>
                ),
              }}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
        </div>
      }
    >
      <AutomationsContent />
    </Suspense>
  );
}
