"use client";

import React, { Suspense, useEffect } from "react";
import {
  Layout,
  Button,
  Card,
  Table,
  Badge,
  Typography,
  Space,
  Alert,
  Spin,
  message,
} from "antd";
import Link from "next/link";
import {
  InstagramOutlined,
  DisconnectOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

interface InstagramAccount {
  id: string;
  instagramUserId: string;
  pageId: string;
  pageName: string;
  connectedAt: string;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const connectedParam = searchParams.get("connected");
  const errorParam = searchParams.get("error");

  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (connectedParam === "true") {
      messageApi.success(
        "Successfully connected your Instagram Business Account!",
      );
      // Clean query params
      router.replace("/");
    } else if (errorParam) {
      messageApi.error(`Connection failed: ${decodeURIComponent(errorParam)}`);
      // Clean query params
      router.replace("/");
    }
  }, [connectedParam, errorParam, router, messageApi]);

  // Query connected state
  const { data, isLoading, error } = useQuery({
    queryKey: ["meta-status"],
    queryFn: async () => {
      const response = await fetch("http://localhost:3001/meta/status");
      if (!response.ok) {
        throw new Error("Failed to fetch connection status from API");
      }
      return response.json() as Promise<{ accounts: InstagramAccount[] }>;
    },
  });

  // Mutate disconnect
  const disconnectMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch("http://localhost:3001/meta/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        throw new Error("Failed to disconnect account");
      }
      return response.json();
    },
    onSuccess: () => {
      messageApi.success("Account disconnected successfully.");
      queryClient.invalidateQueries({ queryKey: ["meta-status"] });
    },
    onError: (err: Error) => {
      messageApi.error(
        err.message || "Failed to disconnect account due to API error",
      );
    },
  });

  const handleConnect = () => {
    window.location.href = "http://localhost:3001/meta/login";
  };

  const columns = [
    {
      title: "Instagram Page Name",
      dataIndex: "pageName",
      key: "pageName",
      render: (text: string) => (
        <span className="font-semibold flex items-center gap-2">
          <InstagramOutlined style={{ color: "#E1306C" }} /> {text}
        </span>
      ),
    },
    {
      title: "Instagram User ID",
      dataIndex: "instagramUserId",
      key: "instagramUserId",
      render: (text: string) => (
        <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">{text}</code>
      ),
    },
    {
      title: "Facebook Page ID",
      dataIndex: "pageId",
      key: "pageId",
      render: (text: string) => (
        <Text type="secondary" className="text-xs">
          {text}
        </Text>
      ),
    },
    {
      title: "Connected At",
      dataIndex: "connectedAt",
      key: "connectedAt",
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: "Status",
      key: "status",
      render: () => <Badge status="success" text="Connected" />,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: InstagramAccount) => (
        <Button
          danger
          type="text"
          icon={<DisconnectOutlined />}
          loading={
            disconnectMutation.isPending &&
            disconnectMutation.variables === record.id
          }
          onClick={() => disconnectMutation.mutate(record.id)}
        >
          Disconnect
        </Button>
      ),
    },
  ];

  return (
    <Layout className="min-h-screen bg-slate-50">
      {contextHolder}
      <Header className="bg-white border-b border-slate-200 px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-red-500 to-indigo-600 flex items-center justify-center">
            <InstagramOutlined className="text-white text-xl" />
          </div>
          <Title
            level={4}
            style={{ margin: 0, fontWeight: 800 }}
            className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent"
          >
            InstaDM Connect
          </Title>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-semibold text-slate-900 border-b-2 border-indigo-600 py-5 text-sm"
          >
            Connections
          </Link>
          <Link
            href="/automations"
            className="font-semibold text-slate-500 hover:text-slate-800 transition py-5 text-sm"
          >
            Automations
          </Link>
        </div>
      </Header>

      <Content className="p-8 max-w-6xl mx-auto w-full flex flex-col gap-8">
        <Card
          bordered={false}
          className="shadow-sm rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 text-white relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 translate-x-20 -translate-y-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <Space direction="vertical" size="small">
              <span className="px-3 py-1 bg-white/10 rounded-full text-indigo-200 text-xs font-semibold tracking-wide uppercase">
                Instagram Business OAuth
              </span>
              <Title
                level={2}
                style={{ margin: 0, color: "white", fontWeight: 800 }}
              >
                Link Facebook & Instagram Business Access
              </Title>
              <Text className="text-slate-300">
                Grant permission for read and manage capabilities by logging in
                via Meta OAuth.
              </Text>
            </Space>
            <Button
              type="primary"
              size="large"
              icon={<InstagramOutlined />}
              className="bg-white text-slate-900 border-none hover:bg-slate-100 font-bold shadow-lg"
              onClick={handleConnect}
            >
              Connect Instagram
            </Button>
          </div>
        </Card>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />}
            />
            <Text type="secondary">
              Retrieving connection status details...
            </Text>
          </div>
        ) : error ? (
          <Alert
            message="Server Error"
            description="Failed to load connections from the backend. Make sure the NestJS backend is running on port 3001."
            type="error"
            showIcon
          />
        ) : (
          <Card
            bordered={false}
            className="shadow-sm rounded-2xl"
            title={
              <div className="flex items-center justify-between w-full py-1">
                <span className="font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircleOutlined className="text-emerald-500" />
                  Active Instagram Profiles ({data?.accounts.length ?? 0})
                </span>
              </div>
            }
          >
            <Table
              dataSource={data?.accounts}
              columns={columns}
              rowKey="id"
              locale={{
                emptyText: (
                  <div className="py-12 text-center">
                    <Text
                      type="secondary"
                      style={{ display: "block", marginBottom: 16 }}
                    >
                      No connected Instagram Business accounts found.
                    </Text>
                    <Button
                      type="dashed"
                      icon={<InstagramOutlined />}
                      onClick={handleConnect}
                    >
                      Connect your first profile
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
      <DashboardContent />
    </Suspense>
  );
}
