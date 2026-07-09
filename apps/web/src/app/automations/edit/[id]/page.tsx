"use client";

import React, { Suspense, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Layout,
  Button,
  Card,
  Input,
  Select,
  InputNumber,
  Typography,
  message,
  Row,
  Col,
  Spin,
  Alert,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  LeftOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const MatchTypeEnum = z.enum(["EXACT", "CONTAINS", "STARTS_WITH"]);

const formSchema = z.object({
  name: z.string().min(1, "Flow name is required"),
  enabled: z.boolean().default(true),
  keywords: z
    .array(
      z.object({
        keyword: z.string().min(1, "Keyword is required"),
        matchType: MatchTypeEnum,
      }),
    )
    .min(1, "At least one keyword is required"),
  actions: z
    .array(
      z.object({
        message: z.string().min(1, "Response message is required"),
        delaySeconds: z
          .number()
          .int()
          .nonnegative("Delay must be numbers >= 0")
          .default(0),
      }),
    )
    .min(1, "At least one reply message is required"),
});

type FormValues = z.infer<typeof formSchema>;

function EditAutomationContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [messageApi, contextHolder] = message.useMessage();

  // Fetch existing details
  const { data, isLoading, error } = useQuery({
    queryKey: ["automation", id],
    queryFn: async () => {
      const response = await fetch(`http://localhost:3001/automations/${id}`);
      if (!response.ok) {
        throw new Error("Failed to load automation details");
      }
      return response.json();
    },
    enabled: !!id,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      enabled: true,
      keywords: [],
      actions: [],
    },
  });

  const {
    fields: keywordFields,
    append: appendKeyword,
    remove: removeKeyword,
  } = useFieldArray({
    control,
    name: "keywords",
  });

  const {
    fields: actionFields,
    append: appendAction,
    remove: removeAction,
  } = useFieldArray({
    control,
    name: "actions",
  });

  // Populate data when loaded
  useEffect(() => {
    if (data) {
      reset({
        name: data.name,
        enabled: data.enabled ?? true,
        keywords: data.keywords.map(
          (kw: {
            keyword: string;
            matchType: "EXACT" | "CONTAINS" | "STARTS_WITH";
          }) => ({
            keyword: kw.keyword,
            matchType: kw.matchType,
          }),
        ),
        actions: data.actions.map(
          (act: { message: string; delaySeconds?: number }) => ({
            message: act.message,
            delaySeconds: act.delaySeconds ?? 0,
          }),
        ),
      });
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: async (payload: FormValues) => {
      const response = await fetch(`http://localhost:3001/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to update automation flow");
      }

      return response.json();
    },
    onSuccess: () => {
      messageApi.success("Automation flow updated successfully!");
      setTimeout(() => {
        router.push("/automations");
      }, 1000);
    },
    onError: (err: Error) => {
      messageApi.error(err.message || "Failed to update flow due to an error");
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
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

      <Content className="p-8 max-w-3xl mx-auto w-full flex flex-col gap-6">
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

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          {/* Section 1: Basic Settings */}
          <Card
            title="Flow Details"
            bordered={false}
            className="shadow-sm rounded-2xl"
          >
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-600">
                Automation Name
              </label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="e.g. Black Friday Promotion flow"
                    size="large"
                  />
                )}
              />
              {errors.name && <Text type="danger">{errors.name.message}</Text>}
            </div>
          </Card>

          {/* Section 2: Keywords Trigger settings */}
          <Card
            title="Keyword Triggers"
            bordered={false}
            className="shadow-sm rounded-2xl"
            extra={
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() =>
                  appendKeyword({ keyword: "", matchType: "EXACT" })
                }
              >
                Add Keyword
              </Button>
            }
          >
            <div className="flex flex-col gap-4">
              {keywordFields.map((field, index) => (
                <Row key={field.id} gutter={16} align="middle">
                  <Col xs={24} md={12}>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">
                        Keyword
                      </label>
                      <Controller
                        name={`keywords.${index}.keyword`}
                        control={control}
                        render={({ field: kwField }) => (
                          <Input
                            {...kwField}
                            placeholder="e.g. promo"
                            size="large"
                          />
                        )}
                      />
                      {errors.keywords?.[index]?.keyword && (
                        <Text type="danger">
                          {errors.keywords[index].keyword.message}
                        </Text>
                      )}
                    </div>
                  </Col>
                  <Col xs={18} md={9}>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">
                        Match Type
                      </label>
                      <Controller
                        name={`keywords.${index}.matchType`}
                        control={control}
                        render={({ field: matchField }) => (
                          <Select
                            {...matchField}
                            size="large"
                            className="w-full"
                          >
                            <Select.Option value="EXACT">
                              EXACT Match
                            </Select.Option>
                            <Select.Option value="CONTAINS">
                              CONTAINS Substring
                            </Select.Option>
                            <Select.Option value="STARTS_WITH">
                              STARTS WITH Prefix
                            </Select.Option>
                          </Select>
                        )}
                      />
                    </div>
                  </Col>
                  <Col xs={6} md={3} className="text-right">
                    <div className="h-6" />
                    <Button
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                      disabled={keywordFields.length === 1}
                      onClick={() => removeKeyword(index)}
                      className="mt-1"
                    />
                  </Col>
                </Row>
              ))}
              {errors.keywords?.root && (
                <Text type="danger">{errors.keywords.root.message}</Text>
              )}
            </div>
          </Card>

          {/* Section 3: Responses Message action settings */}
          <Card
            title="DM Actions & Replies"
            bordered={false}
            className="shadow-sm rounded-2xl"
            extra={
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => appendAction({ message: "", delaySeconds: 0 })}
              >
                Add Message
              </Button>
            }
          >
            <div className="flex flex-col gap-6">
              {actionFields.map((field, index) => (
                <div
                  key={field.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative flex flex-col gap-4"
                >
                  {actionFields.length > 1 && (
                    <Button
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={() => removeAction(index)}
                      className="absolute right-2 top-2"
                    />
                  )}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-semibold text-slate-600">
                      Reply Message
                    </label>
                    <Controller
                      name={`actions.${index}.message`}
                      control={control}
                      render={({ field: msgField }) => (
                        <Input.TextArea
                          {...msgField}
                          placeholder="Write your automated direct message here..."
                          rows={3}
                        />
                      )}
                    />
                    {errors.actions?.[index]?.message && (
                      <Text type="danger">
                        {errors.actions[index].message.message}
                      </Text>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-semibold text-slate-600">
                      Delay Time (seconds)
                    </label>
                    <Controller
                      name={`actions.${index}.delaySeconds`}
                      control={control}
                      render={({ field: delayField }) => (
                        <InputNumber
                          {...delayField}
                          min={0}
                          max={3600}
                          precision={0}
                          placeholder="0s for instant"
                          className="w-48"
                        />
                      )}
                    />
                    <Text type="secondary" className="text-xs">
                      Set delay up to 3600 seconds before automated message
                      dispatch.
                    </Text>
                    {errors.actions?.[index]?.delaySeconds && (
                      <Text type="danger">
                        {errors.actions[index].delaySeconds.message}
                      </Text>
                    )}
                  </div>
                </div>
              ))}
              {errors.actions?.root && (
                <Text type="danger">{errors.actions.root.message}</Text>
              )}
            </div>
          </Card>

          <Button
            type="primary"
            size="large"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={mutation.isPending}
            className="bg-indigo-600 border-none font-bold"
          >
            Save Changes
          </Button>
        </form>
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
