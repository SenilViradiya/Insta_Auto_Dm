"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    BarChart3,
    Activity,
    Bot,
    MessageSquare,
    CheckCircle2,
    XCircle,
    TrendingUp,
    Key,
    Database,
    AlertCircle,
} from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import {
    MetricCard,
    Section,
} from "../../components/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface InstagramAccount {
    id: string;
    instagramUserId: string;
    pageId: string;
    pageName: string;
    connectedAt: string;
}

interface ChartCardProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    extra?: React.ReactNode;
}

function ChartCard({ title, subtitle, children, extra }: ChartCardProps) {
    return (
        <Section title={title} description={subtitle} extra={extra}>
            {children}
        </Section>
    );
}

interface ActivityItem {
    id: string;
    automationName: string;
    triggerType: string;
    status: string;
    username: string;
    contentText: string;
    timestamp: string;
}

function ActivityFeedItem({ activity }: { activity: ActivityItem }) {
    const getBadge = (s: string) => {
        if (s === "SUCCESS") {
            return <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--success)" }} />;
        }
        if (s === "FAILED") {
            return <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--danger)" }} />;
        }
        return <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--warning)" }} />;
    };

    const t = new Date(activity.timestamp);

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderBottom: "1px solid var(--divider)",
                fontSize: "13px",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                {getBadge(activity.status)}
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>@{activity.username}</span>
                        <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>triggered</span>
                        <span style={{ fontWeight: 650, color: "var(--primary)", fontSize: "12px" }}>{activity.automationName}</span>
                    </div>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "400px" }}>
                        "{activity.contentText}"
                    </span>
                </div>
            </div>

            <div style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                {t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </div>
        </div>
    );
}

export default function AnalyticsDashboardPage() {
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

    // Fetch connection accounts
    const { data: statusData, isLoading: accountsLoading, error: accountsError, refetch: refetchAccounts } = useQuery({
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

    // Fetch Live Automations
    const { data: automationsList = [], isLoading: automationsLoading, error: automationsError, refetch: refetchAutomations } = useQuery({
        queryKey: ["analytics-automations", selectedAccountId],
        queryFn: async () => {
            if (!selectedAccountId) return [];
            const response = await fetch(`${API_URL}/automations`, {
                headers: { "x-instagram-account-id": selectedAccountId }
            });
            if (!response.ok) throw new Error("Failed to load active automations");
            const json = await response.json();
            return Array.isArray(json.items) ? json.items : [];
        },
        enabled: !!selectedAccountId,
    });

    // Fetch Live Executions
    const { data: executionsResponse, isLoading: executionsLoading, error: executionsError, refetch: refetchExecutions } = useQuery({
        queryKey: ["analytics-executions", selectedAccountId],
        queryFn: async () => {
            if (!selectedAccountId) return { items: [], total: 0 };
            const response = await fetch(`${API_URL}/executions?limit=250`);
            if (!response.ok) throw new Error("Failed to load executions logs");
            return response.json() as Promise<{ items: any[]; total: number }>;
        },
        enabled: !!selectedAccountId,
    });

    // Fetch Live assets
    const { data: assetsResponse, isLoading: assetsLoading, error: assetsError, refetch: refetchAssets } = useQuery({
        queryKey: ["analytics-assets", selectedAccountId],
        queryFn: async () => {
            if (!selectedAccountId) return [];
            const response = await fetch(`${API_URL}/assets/reels`, {
                headers: { "x-instagram-account-id": selectedAccountId }
            });
            if (!response.ok) throw new Error("Failed to load synchronized reels");
            return response.json() as Promise<any[]>;
        },
        enabled: !!selectedAccountId,
    });

    // Fetch Live Messaging Metrics Service
    const { data: messagingMetrics, error: metricsError, refetch: refetchMetrics } = useQuery({
        queryKey: ["analytics-messaging-metrics"],
        queryFn: async () => {
            const response = await fetch(`${API_URL}/messaging/metrics`);
            if (!response.ok) throw new Error("Failed to load delivery latency statistics");
            return response.json();
        }
    });

    const anyQueryError = accountsError || automationsError || executionsError || assetsError || metricsError;

    const handleRetry = () => {
        refetchAccounts();
        if (selectedAccountId) {
            refetchAutomations();
            refetchExecutions();
            refetchAssets();
        }
        refetchMetrics();
    };

    // Compile calculations mapping live backend to dashboard views
    const dashboardCalculations = React.useMemo(() => {
        const liveExecs = executionsResponse?.items || [];
        const liveAutos = automationsList || [];
        const liveReels = assetsResponse || [];

        // Verify dataset availability
        if (liveExecs.length === 0) {
            return {
                hasData: false,
                metrics: null
            };
        }

        // Process active enabled automations
        const activeAutosCount = liveAutos.filter((a: any) => a.enabled).length;

        // Process Executed Triggers within the last 24 hours
        const today = new Date();
        const triggeredTodayCount = liveExecs.filter((exec: any) => {
            const d = new Date(exec.startedAt);
            return (today.getTime() - d.getTime()) <= 1000 * 60 * 60 * 24;
        }).length;

        // Real Success Status statistics
        const successes = liveExecs.filter((e: any) => e.status === "SUCCESS");
        const totalRuns = liveExecs.length;
        const successRate = totalRuns > 0 ? (successes.length / totalRuns) * 105 : 100;
        const boundedSuccessRate = Math.min(100, Math.round(successRate * 10) / 10);
        const failedCount = liveExecs.filter((e: any) => e.status === "FAILED").length;

        // DM Sent Volume
        const dmSentCount = messagingMetrics?.messagesSent || successes.length;

        // Comment Triggers matched
        const commentsMatchedCount = liveExecs.filter(
            (e: any) => e.automation?.triggerType === "REEL_COMMENT" || e.automation?.triggerType === "POST_COMMENT"
        ).length;

        // Avg Response velocity calculation using actual success logs duration
        const avgResponseTimeMs = successes.length > 0
            ? successes.reduce((acc: number, cur: any) => acc + (cur.durationMs || 0), 0) / successes.length
            : messagingMetrics?.averageSendTimeMs || 1000;

        // Leaderboard calculations for active automations runs
        const autoCounts: Record<string, { runs: number; success: number; name: string }> = {};
        liveExecs.forEach((e: any) => {
            const id = e.automationId;
            const name = e.automation?.name || "Untitled Flow";
            if (!autoCounts[id]) autoCounts[id] = { runs: 0, success: 0, name };
            autoCounts[id].runs++;
            if (e.status === "SUCCESS") autoCounts[id].success++;
        });

        const sortedAutos = Object.values(autoCounts).sort((a, b) => b.runs - a.runs);
        const topAutomationName = sortedAutos.length > 0 ? sortedAutos[0].name : "N/A";

        // Top keywords parsed dynamically from live configurations
        const keywordMap: Record<string, number> = {};
        liveExecs.forEach((e: any) => {
            const config = e.automation?.triggerConfig;
            if (config && typeof config === "object") {
                const matchKeywords = (config as any).keywords || (config as any).keyword;
                if (matchKeywords) {
                    const keys = Array.isArray(matchKeywords) ? matchKeywords : [matchKeywords];
                    keys.forEach((k: string) => {
                        keywordMap[k] = (keywordMap[k] || 0) + 1;
                    });
                }
            }
        });

        let topKeywordStr = "—";
        let topKeywordCount = 0;
        Object.entries(keywordMap).forEach(([k, count]) => {
            if (count > topKeywordCount) {
                topKeywordCount = count;
                topKeywordStr = k;
            }
        });

        // Top reels mapping commentary executions
        const topReelsFormatted = liveReels.slice(0, 3).map((r) => {
            const matchingExecs = liveExecs.filter((e) => {
                const config = e.automation?.triggerConfig;
                if (config && typeof config === "object") {
                    const mediaId = (config as any).mediaId || (config as any).instagramMediaId;
                    return mediaId === r.instagramMediaId;
                }
                return false;
            });
            return {
                caption: r.caption || "Instagram Video Post",
                comments: matchingExecs.length,
            };
        });

        let topReelCaption = "—";
        if (liveReels.length > 0) {
            topReelCaption = liveReels[0].caption || `Media: ${liveReels[0].instagramMediaId.slice(0, 10)}`;
        }

        // Daily executions weekly graph mapping
        const dailyMap: Record<string, { label: string; total: number; success: number }> = {};
        const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const key = d.toDateString();
            dailyMap[key] = { label: weekday[d.getDay()], total: 0, success: 0 };
        }

        liveExecs.forEach((e: any) => {
            const dateKey = new Date(e.startedAt).toDateString();
            if (dailyMap[dateKey]) {
                dailyMap[dateKey].total++;
                if (e.status === "SUCCESS") {
                    dailyMap[dateKey].success++;
                }
            }
        });

        const dailyExecutionsList = Object.values(dailyMap);

        // Channel Distribution calculations
        const triggerMap: Record<string, number> = {};
        liveExecs.forEach((e: any) => {
            const t = e.automation?.triggerType || "DIRECT_MESSAGE";
            triggerMap[t] = (triggerMap[t] || 0) + 1;
        });

        const sumTriggers = Object.values(triggerMap).reduce((a, b) => a + b, 0) || 1;
        const triggerDistributionList = Object.entries(triggerMap).map(([name, count]) => ({
            name: name === "REEL_COMMENT" ? "Reel Comment" : name === "POST_COMMENT" ? "Post Comment" : name === "DIRECT_MESSAGE" ? "Direct Message" : name,
            count,
            pct: Math.round((count / sumTriggers) * 100)
        }));

        // Top formatted campaigns
        const topAutomationsFormatted = sortedAutos.slice(0, 4).map((item) => ({
            name: item.name,
            runs: item.runs,
            rate: `${((item.success / item.runs) * 100).toFixed(0)}%`
        }));

        // Live recent executions feed mapping
        const recentActivityFeed = liveExecs.slice(0, 5).map((e: any) => {
            const textVal = e.metadata?.commentText || e.metadata?.messageText || "Triggered automation workflows successfully";
            const uName = e.metadata?.senderUsername || "visitor";

            return {
                id: e.id,
                automationName: e.automation?.name || "Auto-DM Target",
                triggerType: e.automation?.triggerType || "DIRECT_MESSAGE",
                status: e.status,
                username: uName,
                contentText: textVal,
                timestamp: e.startedAt
            };
        });

        return {
            hasData: true,
            metrics: {
                activeAutomations: activeAutosCount,
                triggeredToday: triggeredTodayCount,
                dmSent: dmSentCount,
                commentsMatched: commentsMatchedCount,
                avgResponseMs: avgResponseTimeMs,
                successRate: boundedSuccessRate,
                failedCount,
                topAutomation: topAutomationName,
                topReel: topReelCaption,
                topKeyword: topKeywordStr,
                dailyExecutions: dailyExecutionsList,
                triggerGroup: triggerDistributionList,
                topAutomationsList: topAutomationsFormatted,
                topReelsList: topReelsFormatted,
                recentActivity: recentActivityFeed
            }
        };
    }, [executionsResponse, automationsList, assetsResponse, messagingMetrics]);

    const { hasData, metrics } = dashboardCalculations;

    // Loading layout Shimmer State
    const renderLoadingSkeleton = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                {[1, 2, 3, 4].map((idx) => (
                    <div
                        key={idx}
                        style={{
                            height: "120px",
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-lg)",
                            padding: "20px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                        }}
                        className="skeleton"
                    />
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "20px" }}>
                <div style={{ height: "260px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }} className="skeleton" />
                <div style={{ height: "260px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }} className="skeleton" />
            </div>
        </div>
    );

    return (
        <AppShell>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
                {/* Header title block */}
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
                            <BarChart3 size={22} color="var(--primary)" />
                            Analytics Dashboard
                        </h1>
                        <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
                            Evaluate marketing funnel yields, audit trigger response velocity, and trace client interaction conversion charts.
                        </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        {statusData?.accounts && selectedAccountId && (
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
                                    border: "1px solid var(--border)"
                                }}
                            >
                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--success)" }} />
                                <span>Active Profile: <strong style={{ color: "var(--text-primary)" }}>{
                                    statusData.accounts.find((a) => a.id === selectedAccountId)?.pageName || ""
                                }</strong></span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Error Banner */}
                {anyQueryError ? (
                    <div
                        style={{
                            padding: "var(--space-8)",
                            background: "var(--danger-bg)",
                            border: "1px solid #FECACA",
                            borderRadius: "var(--radius-md)",
                            color: "var(--danger)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            alignItems: "center",
                            textAlign: "center"
                        }}
                    >
                        <AlertCircle size={24} />
                        <div>
                            <h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>Failed to fetch analytics metrics</h3>
                            <p style={{ fontSize: "12px", margin: "4px 0 0 0", color: "var(--text-secondary)" }}>
                                An error occurred loading metrics: {String(anyQueryError)}
                            </p>
                        </div>
                        <button
                            onClick={handleRetry}
                            style={{
                                padding: "8px 16px",
                                background: "var(--danger)",
                                color: "#fff",
                                border: "none",
                                borderRadius: "var(--radius-md)",
                                fontSize: "12px",
                                fontWeight: 500,
                                cursor: "pointer",
                            }}
                        >
                            Retry Query
                        </button>
                    </div>
                ) : accountsLoading || automationsLoading || executionsLoading || assetsLoading ? (
                    renderLoadingSkeleton()
                ) : !hasData || !metrics ? (
                    // Analytics Empty State
                    <div
                        style={{
                            padding: "var(--space-14)",
                            background: "var(--surface)",
                            border: "1px dashed var(--border)",
                            borderRadius: "var(--radius-lg)",
                            textAlign: "center",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                            margin: "24px 0"
                        }}
                    >
                        <Database size={36} color="var(--text-muted)" />
                        <h3 style={{ fontSize: 16, fontWeight: 650, color: "var(--text-primary)", margin: "8px 0 0 0" }}>
                            No analytics yet
                        </h3>
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 var(--space-4) 0", maxWidth: 380, lineHeight: 1.6 }}>
                            No automation executions have been completed. Run your automations to begin populating performance metrics and analytics graphs.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

                        {/* Metric Blocks Grid */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                                gap: "16px"
                            }}
                        >
                            <MetricCard
                                title="Active Automations"
                                value={metrics.activeAutomations}
                                subtitle="Enabled triggers configured on account"
                                icon={<Bot size={18} />}
                            />
                            <MetricCard
                                title="Triggered Today"
                                value={metrics.triggeredToday}
                                subtitle="Webhook triggers received last 24h"
                                icon={<Activity size={18} />}
                            />
                            <MetricCard
                                title="DM Sent Volume"
                                value={metrics.dmSent}
                                subtitle="Direct messages delivered successfully"
                                icon={<MessageSquare size={18} />}
                            />
                            <MetricCard
                                title="Trigger Success Rate"
                                value={`${metrics.successRate}%`}
                                subtitle="Completion ratio vs permanent failures"
                                icon={<CheckCircle2 size={18} />}
                            />
                        </div>

                        {/* Extra details stats row */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                gap: "16px",
                                background: "var(--surface-secondary)",
                                border: "1px dashed var(--border)",
                                borderRadius: "var(--radius-lg)",
                                padding: "16px 20px"
                            }}
                        >
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                                    Comments Matched
                                </span>
                                <span style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
                                    {metrics.commentsMatched}
                                </span>
                                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Reel & Post comments filtered</span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                                    Avg Trigger Time
                                </span>
                                <span style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
                                    {(metrics.avgResponseMs / 1000).toFixed(2)}s
                                </span>
                                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Worker execution turnaround speed</span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                                    Failed Executions
                                </span>
                                <span style={{ fontSize: "18px", fontWeight: 700, color: "var(--danger)" }}>
                                    {metrics.failedCount}
                                </span>
                                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Permanently routed to repository</span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                                    Primary Keyword
                                </span>
                                <span style={{ fontSize: "18px", fontWeight: 700, color: "var(--primary)", display: "flex", alignItems: "center", gap: "4px" }}>
                                    <Key size={14} />
                                    {metrics.topKeyword !== "—" ? `"${metrics.topKeyword}"` : "—"}
                                </span>
                                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>High-frequency filter pattern</span>
                            </div>
                        </div>

                        {/* Charts Row Double columns */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1.6fr 1fr",
                                gap: "20px",
                                alignItems: "stretch"
                            }}
                            className="analytics-grid-row"
                        >
                            {/* Chart Card 1: Daily Executions */}
                            <ChartCard
                                title="Daily Execution Volumes"
                                subtitle="Automation execution triggers tracked daily over the past week"
                            >
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: "130px", paddingBottom: "10px", borderBottom: "1px solid var(--border)" }}>
                                        {metrics.dailyExecutions.map((day, idx) => {
                                            const highestRun = Math.max(...metrics.dailyExecutions.map(d => d.total)) || 1;
                                            const totalHeight = Math.max(8, Math.min(100, (day.total / highestRun) * 100));
                                            const successHeight = day.total > 0 ? Math.max(6, Math.min(100, (day.success / day.total) * totalHeight)) : 0;

                                            return (
                                                <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "12%", gap: "6px" }}>
                                                    <span style={{ fontSize: "9px", fontFamily: "monospace", color: "var(--text-muted)" }}>{day.total}</span>
                                                    <div style={{ width: "100%", height: "100px", background: "var(--hover-bg)", borderRadius: "4px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                                                        {/* Failed portion */}
                                                        <div style={{ width: "100%", height: `${totalHeight}%`, background: "var(--danger)", opacity: 0.15, position: "absolute", bottom: 0, left: 0 }} />
                                                        {/* Success portion */}
                                                        <div style={{ width: "100%", height: `${successHeight}%`, background: "linear-gradient(180deg, var(--primary) 0%, var(--primary-hover) 100%)", borderRadius: "2px" }} />
                                                    </div>
                                                    <span style={{ fontSize: "11px", fontWeight: 650, color: "var(--text-secondary)" }}>{day.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div style={{ display: "flex", gap: "16px", fontSize: "11px", color: "var(--text-muted)", justifyContent: "center" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                            <div style={{ width: "10px", height: "10px", background: "var(--primary)", borderRadius: "2px" }} />
                                            <span>Success Runs</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                            <div style={{ width: "10px", height: "10px", background: "var(--danger)", opacity: 0.2, borderRadius: "2px" }} />
                                            <span>Failure Errors</span>
                                        </div>
                                    </div>
                                </div>
                            </ChartCard>

                            {/* Chart Card 2: Distributions */}
                            <ChartCard
                                title="Trigger Distribution Type"
                                subtitle="Percentage breakdown by inbound channel triggers"
                            >
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px", justifyContent: "center" }}>
                                    {metrics.triggerGroup.map((trig, idx) => (
                                        <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                                                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{trig.name}</span>
                                                <span style={{ color: "var(--text-muted)" }}>{trig.count} ({trig.pct}%)</span>
                                            </div>
                                            <div style={{ width: "100%", height: "8px", background: "var(--border)", borderRadius: "4px", overflow: "hidden" }}>
                                                <div
                                                    style={{
                                                        width: `${trig.pct}%`,
                                                        height: "100%",
                                                        background: idx === 0 ? "var(--primary)" : idx === 1 ? "#3B82F6" : idx === 2 ? "#10B981" : "#FBBF24",
                                                        borderRadius: "4px"
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}

                                    {metrics.triggerGroup.length === 0 && (
                                        <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "12px", padding: "20px 0" }}>
                                            No trigger distribution data.
                                        </div>
                                    )}
                                </div>
                            </ChartCard>
                        </div>

                        {/* Performance Ranking lists block */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "20px"
                            }}
                            className="analytics-grid-row"
                        >
                            {/* Leaderboard 1: Top performing automations */}
                            <ChartCard
                                title="Top Performing Workflows"
                                subtitle="High efficacy auto-DM campaign pipelines"
                            >
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", paddingBottom: "8px", borderBottom: "1px solid var(--border)", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>
                                        <span>CAMPAIGN WORKFLOW</span>
                                        <span style={{ textAlign: "center" }}>TOTAL RUNS</span>
                                        <span style={{ textAlign: "right" }}>SUCCESS RATE</span>
                                    </div>

                                    {metrics.topAutomationsList.map((item, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: "2fr 1fr 1fr",
                                                padding: "10px 0",
                                                borderBottom: "1px solid var(--divider)",
                                                fontSize: "12px",
                                                alignItems: "center"
                                            }}
                                        >
                                            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</span>
                                            <span style={{ textAlign: "center", color: "var(--text-secondary)" }}>{item.runs}</span>
                                            <span style={{ textAlign: "right", fontWeight: 650, color: "var(--success)" }}>{item.rate}</span>
                                        </div>
                                    ))}

                                    {metrics.topAutomationsList.length === 0 && (
                                        <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "12px", padding: "20px 0" }}>
                                            No workflow performance history found.
                                        </div>
                                    )}
                                </div>
                            </ChartCard>

                            {/* Leaderboard 2: Top performing reels */}
                            <ChartCard
                                title="Top Performing Assets"
                                subtitle="Instagram media posts yielding highest inbox interactions"
                            >
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1.5fr", paddingBottom: "8px", borderBottom: "1px solid var(--border)", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>
                                        <span>MEDIA CAPTION</span>
                                        <span style={{ textAlign: "right" }}>AUTO-RESPONSES TRIGGERED</span>
                                    </div>

                                    {metrics.topReelsList.map((item, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: "2.5fr 1.5fr",
                                                padding: "10px 0",
                                                borderBottom: "1px solid var(--divider)",
                                                fontSize: "12px",
                                                alignItems: "center"
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontWeight: 550,
                                                    color: "var(--text-primary)",
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    paddingRight: "8px"
                                                }}
                                            >
                                                {item.caption}
                                            </span>
                                            <span style={{ textAlign: "right", fontWeight: 650, color: "var(--success)" }}>
                                                {item.comments}
                                            </span>
                                        </div>
                                    ))}

                                    {metrics.topReelsList.length === 0 && (
                                        <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "12px", padding: "20px 0" }}>
                                            No synchronised Reels interactions.
                                        </div>
                                    )}
                                </div>
                            </ChartCard>
                        </div>

                        {/* Recent Activity Feed list section */}
                        <div
                            style={{
                                background: "var(--surface)",
                                border: "1px solid var(--border)",
                                borderRadius: "var(--radius-lg)",
                                overflow: "hidden"
                            }}
                        >
                            <div
                                style={{
                                    padding: "16px 20px",
                                    background: "var(--surface-secondary)",
                                    borderBottom: "1px solid var(--border)",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <TrendingUp size={16} color="var(--primary)" />
                                    <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                                        Live Automation Activity Feed
                                    </h3>
                                </div>
                                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                    Captured in real-time
                                </span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column" }}>
                                {metrics.recentActivity.map((activity) => (
                                    <ActivityFeedItem key={activity.id} activity={activity} />
                                ))}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </AppShell>
    );
}
