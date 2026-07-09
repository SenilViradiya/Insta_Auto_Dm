"use client";

import React, { Suspense } from "react";
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
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  LoadingOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Keyword {
  id: string;
  keyword: string;
  matchType: "EXACT" | "CONTAINS" | "STARTS_WITH";
}

interface Action {
  id: string;
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

function AutomationsContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  // Query automations
  const { data, isLoading, error } = useQuery({
    queryKey: ["automations"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/automations`);
      if (!response.ok) {
        throw new Error("Failed to fetch automations");
      }
      return response.json() as Promise<Automation[]>;
    },
  });

  // Toggle switch enabled/disabled
  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const response = await fetch(`${API_URL}/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) {
        throw new Error("Failed to update status");
      }
      return response.json();
    },
    onSuccess: () => {
      messageApi.success("Automation status updated.");
      queryClient.invalidateQueries({ queryKey: ["automations"] });
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
      });
      if (!response.ok) {
        throw new Error("Failed to delete automation");
      }
      return response.json();
    },
    onSuccess: () => {
      messageApi.success("Automation deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["automations"] });
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
          <Text type="secondary" className="text-xs">
            Created: {new Date(record.createdAt).toLocaleDateString()}
          </Text>
        </Space>
      ),
    },
    {
      title: "Keywords & Triggers",
      dataIndex: "keywords",
      key: "keywords",
      render: (keywords: Keyword[]) => (
        <div className="flex flex-wrap gap-2 max-w-sm">
          {keywords.map((kw) => {
            let color = "blue";
            if (kw.matchType === "EXACT") color = "purple";
            if (kw.matchType === "STARTS_WITH") color = "cyan";
            return (
              <Badge
                key={kw.id}
                count={`${kw.keyword} (${kw.matchType.toLowerCase()})`}
                style={{ backgroundColor: color, color: "#fff" }}
              />
            );
          })}
        </div>
      ),
    },
    {
      title: "DM Responses & Actions",
      dataIndex: "actions",
      key: "actions",
      render: (actions: Action[]) => (
        <div className="max-w-md">
          {actions.map((act) => (
            <div
              key={act.id}
              className="flex flex-col gap-1 bg-slate-100 p-2.5 rounded-lg border border-slate-200"
            >
              <Text className="italic text-xs font-semibold text-slate-500">
                Message Content:
              </Text>
              <Text className="text-sm font-medium text-slate-800">
                &ldquo;{act.message}&rdquo;
              </Text>
              {act.delaySeconds > 0 && (
                <Badge
                  status="processing"
                  text={`Delay response: ${act.delaySeconds}s`}
                  className="mt-1"
                />
              )}
            </div>
          ))}
        </div>
      ),
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
            onClick={() => router.push(`/automations/edit/${record.id}`)}
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

      <Content className="p-8 max-w-6xl mx-auto w-full flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <Title
              level={2}
              style={{ margin: 0, fontWeight: 800 }}
              className="text-slate-800"
            >
              Keyword Automations
            </Title>
            <Text type="secondary">
              Set automated responses to send whenever a user direct messages a
              configured keyword.
            </Text>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => router.push("/automations/create")}
            className="bg-indigo-600 border-none font-bold"
          >
            Create Automation
          </Button>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />}
            />
            <Text type="secondary">Retrieving keyword workflows...</Text>
          </div>
        ) : error ? (
          <Alert
            message="Server Error"
            description="Failed to load automations from the backend. Make sure the NestJS backend is running on port 3001."
            type="error"
            showIcon
          />
        ) : (
          <Card bordered={false} className="shadow-sm rounded-2xl">
            <Table
              dataSource={data}
              columns={columns}
              rowKey="id"
              locale={{
                emptyText: (
                  <div className="py-16 text-center">
                    <SettingOutlined className="text-4xl text-slate-300 mb-4" />
                    <Title level={4}>No Automations Found</Title>
                    <Text
                      type="secondary"
                      style={{ display: "block", marginBottom: 20 }}
                    >
                      Control messages by creating a keyword flows template.
                    </Text>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => router.push("/automations/create")}
                      className="bg-indigo-600 border-none"
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
