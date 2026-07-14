"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Activity,
    AlertCircle,
    Search,
    Filter,
    ArrowUpDown,
    CheckCircle2,
    XCircle,
    Clock,
    Play,
    RotateCcw,
    ExternalLink,
    ChevronRight,
    Copy,
    Info,
    Calendar,
    Layers,
    ArrowRight,
    Database,
    Terminal,
    HelpCircle,
    CornerDownRight
} from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface InstagramAccount {
    id: string;
    instagramUserId: string;
    pageId: string;
    pageName: string;
    connectedAt: string;
}

interface Automation {
    id: string;
    name: string;
    triggerType: string;
}

interface ExecutionLog {
    id: string;
    level: string;
    message: string;
    metadata: any;
    createdAt: string;
}

interface Execution {
    id: string;
    automationId: string;
    eventId: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    durationMs: number | null;
    automation?: Automation;
}

// Pre-seeded high fidelity mock runs
const MOCK_EXECUTIONS: any[] = [
    {
        id: "exec_stripe_style_comment01",
        automationId: "auto_01",
        automation: { id: "auto_01", name: "Promo Comments Auto-DM", triggerType: "REEL_COMMENT" },
        eventId: "evt_comment_8y2321x",
        status: "SUCCESS",
        startedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(), // 12m ago
        completedAt: new Date(Date.now() - 1000 * 60 * 12 + 1650).toISOString(),
        durationMs: 1650,
        variables: {
            "user.username": "jayesh",
            "comment.text": "I need details please!",
            "reel.caption": "New AI models released. Comment details below to get direct links.",
            "current_time": new Date().toISOString(),
        },
        logs: [
            { id: "log_1", level: "INFO", message: "[Trigger matched] Execution pipeline initialized with status QUEUED (Automation: \"Promo Comments Auto-DM\")", metadata: { matchedKeyword: ["details"], commentId: "evt_comment_8y2321x", publicReplyStatus: "SUCCESS", dmStatus: "QUEUED" }, createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
            { id: "log_2", level: "INFO", message: "Enqueuing first action step: SEND_MESSAGE (Index: 0)", metadata: { actionId: "act_send_01" }, createdAt: new Date(Date.now() - 1000 * 60 * 12 + 100).toISOString() },
            { id: "log_3", level: "INFO", message: "Executing action: SEND_MESSAGE", metadata: { actionId: "act_send_01", payload: { messageText: "Hey @{user.username}, here is your download link: http://auto.dm/free-ai" } }, createdAt: new Date(Date.now() - 1000 * 60 * 12 + 250).toISOString() },
            { id: "log_4", level: "INFO", message: "[Execution completed] Automation execution completed successfully.", metadata: { durationMs: 1650, dmStatus: "SENT" }, createdAt: new Date(Date.now() - 1000 * 60 * 12 + 1650).toISOString() }
        ],
        retries: [],
        errors: null
    },
    {
        id: "exec_stripe_style_comment02",
        automationId: "auto_02",
        automation: { id: "auto_02", name: "Black Friday Discount Lead", triggerType: "POST_COMMENT" },
        eventId: "evt_post_3a8d9df",
        status: "SUCCESS",
        startedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45m ago
        completedAt: new Date(Date.now() - 1000 * 60 * 45 + 5120).toISOString(),
        durationMs: 5120,
        variables: {
            "user.username": "sarah_m",
            "comment.text": "Could you sharing the discount coupon code?",
            "post.caption": "Massive sales event: get access now!",
            "current_time": new Date().toISOString(),
        },
        logs: [
            { id: "log_20", level: "INFO", message: "[Trigger matched] Execution pipeline initialized with status QUEUED (Automation: \"Black Friday Discount Lead\")", metadata: { matchedKeyword: ["discount"], commentId: "evt_post_3a8d9df", publicReplyStatus: "SUCCESS", dmStatus: "QUEUED" }, createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
            { id: "log_21", level: "INFO", message: "Scheduling next action: WAIT (Index: 0, delay: 5s)", metadata: { nextActionId: "act_wait_02" }, createdAt: new Date(Date.now() - 1000 * 60 * 45 + 100).toISOString() },
            { id: "log_22", level: "INFO", message: "Executing action: SEND_MESSAGE", metadata: { actionId: "act_send_02", payload: { messageText: "Hi @{user.username}, here is your discount: BF50" } }, createdAt: new Date(Date.now() - 1000 * 60 * 45 + 5100).toISOString() },
            { id: "log_23", level: "INFO", message: "[Execution completed] Automation execution completed successfully.", metadata: { durationMs: 5120, dmStatus: "SENT" }, createdAt: new Date(Date.now() - 1000 * 60 * 45 + 5120).toISOString() }
        ],
        retries: [],
        errors: null
    },
    {
        id: "exec_stripe_style_comment03",
        automationId: "auto_03",
        automation: { id: "auto_03", name: "Support Direct Message Bot", triggerType: "DIRECT_MESSAGE" },
        eventId: "evt_msg_v9231aa",
        status: "FAILED",
        startedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2h ago
        completedAt: new Date(Date.now() - 1000 * 60 * 120 + 24500).toISOString(),
        durationMs: 24500,
        variables: {
            "user.username": "alex_k",
            "message.text": "Hi, my login fails on page load.",
            "current_time": new Date().toISOString(),
        },
        logs: [
            { id: "log_30", level: "INFO", message: "[Trigger matched] Execution pipeline initialized with status QUEUED (Automation: \"Support Direct Message Bot\")", metadata: { dmStatus: "QUEUED" }, createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
            { id: "log_31", level: "INFO", message: "Executing action: SEND_MESSAGE", metadata: { actionId: "act_send_03" }, createdAt: new Date(Date.now() - 1000 * 60 * 120 + 150).toISOString() },
            { id: "log_32", level: "WARN", message: "Action execution failed transiently. Retrying (Attempt 1/3). Reason: Meta API authorization token expired. Recipient: 1029312.", metadata: { error: "HTTP 401 Unauthorized" }, createdAt: new Date(Date.now() - 1000 * 60 * 120 + 5000).toISOString() },
            { id: "log_33", level: "WARN", message: "Action execution failed transiently. Retrying (Attempt 2/3). Reason: Meta API authorization token expired. Recipient: 1029312.", metadata: { error: "HTTP 401 Unauthorized" }, createdAt: new Date(Date.now() - 1000 * 60 * 120 + 15000).toISOString() },
            { id: "log_34", level: "ERROR", message: "Action step execution failed permanently. Moved to DLQ. Reason: Meta API authorization token expired. Recipient: 1029312.", metadata: { error: "HTTP 401 Unauthorized" }, createdAt: new Date(Date.now() - 1000 * 60 * 120 + 24500).toISOString() }
        ],
        retries: [
            { attempt: 1, timestamp: new Date(Date.now() - 1000 * 60 * 120 + 5000).toISOString(), error: "Meta API authorization token expired. Recipient: 1029312. HTTP 401" },
            { attempt: 2, timestamp: new Date(Date.now() - 1000 * 60 * 120 + 15000).toISOString(), error: "Meta API authorization token expired. Recipient: 1029312. HTTP 401" },
            { attempt: 3, timestamp: new Date(Date.now() - 1000 * 60 * 120 + 24500).toISOString(), error: "Meta API authorization token expired. Recipient: 1029312. HTTP 401" }
        ],
        errors: {
            message: "Meta API authorization token expired. Recipient: 1029312. HTTP 401",
            code: "META_AUTH_EXPIRED",
            stack: "Error: Meta API authorization token expired\n  at MetaMessagingService.sendDirectMessage (messaging.service.ts:89)\n  at ActionWorker.process (action.worker.ts:162)\n  at Job.run (job.js:29)"
        }
    },
    {
        id: "exec_stripe_style_comment04",
        automationId: "auto_04",
        automation: { id: "auto_04", name: "Story Reply Nurture Sequence", triggerType: "STORY_REPLY" },
        eventId: "evt_story_k78qwe",
        status: "WAITING",
        startedAt: new Date(Date.now() - 1000 * 300).toISOString(), // 5m ago
        completedAt: null,
        durationMs: null,
        variables: {
            "user.username": "mike_dev",
            "comment.text": "Incredible reels designs!",
            "current_time": new Date().toISOString(),
        },
        logs: [
            { id: "log_40", level: "INFO", message: "[Trigger matched] Execution pipeline initialized with status QUEUED (Automation: \"Story Reply Nurture Sequence\")", metadata: { dmStatus: "QUEUED" }, createdAt: new Date(Date.now() - 1000 * 300).toISOString() },
            { id: "log_41", level: "INFO", message: "Scheduling next action: WAIT (Index: 0, delay: 1800s)", metadata: { nextActionId: "act_wait_04" }, createdAt: new Date(Date.now() - 1000 * 300 + 50).toISOString() },
            { id: "log_42", level: "INFO", message: "Action requested WAITING state. Transitioning execution to WAITING.", metadata: {}, createdAt: new Date(Date.now() - 1000 * 300 + 80).toISOString() }
        ],
        retries: [],
        errors: null
    }
];

export default function ExecutionsPage() {
    const router = useRouter();
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

    // States for search and filter controls
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [automationFilter, setAutomationFilter] = useState("ALL");
    const [dateFilter, setDateFilter] = useState("ALL");
    const [showSimulated, setShowSimulated] = useState(true);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Detail Drawer state
    const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
    const [drawerTab, setDrawerTab] = useState<"details" | "logs" | "payload" | "retries">("details");

    // Fetch connection accounts
    const { data: statusData, isLoading: accountsLoading, error: accountsError } = useQuery({
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

    // Fetch automations list for dropdown filter options
    const { data: automationsList = [] } = useQuery({
        queryKey: ["automations-dropdown", selectedAccountId],
        queryFn: async () => {
            if (!selectedAccountId) return [];
            const response = await fetch(`${API_URL}/automations`, {
                headers: { "x-instagram-account-id": selectedAccountId }
            });
            if (!response.ok) return [];
            const json = await response.json();
            return Array.isArray(json.items) ? (json.items as Automation[]) : [];
        },
        enabled: !!selectedAccountId,
    });

    // Fetch Executions Query
    const { data: executionsResponse, isLoading: executionsLoading, refetch } = useQuery({
        queryKey: ["executions", selectedAccountId, statusFilter, automationFilter, currentPage, pageSize],
        queryFn: async () => {
            if (!selectedAccountId) return { items: [], total: 0 };
            const params = new URLSearchParams();
            if (statusFilter !== "ALL") params.append("status", statusFilter);
            if (automationFilter !== "ALL") params.append("automationId", automationFilter);
            params.append("page", String(currentPage));
            params.append("limit", String(pageSize));

            const response = await fetch(`${API_URL}/executions?${params.toString()}`);
            if (!response.ok) throw new Error("Failed to fetch executions data");
            return response.json() as Promise<{ items: Execution[]; total: number }>;
        },
        enabled: !!selectedAccountId,
    });

    // Fetch the selected execution details + logs
    const { data: selectedExecutionLogs = [], isLoading: logsLoading } = useQuery({
        queryKey: ["execution-logs", selectedExecutionId],
        queryFn: async () => {
            if (!selectedExecutionId) return [];
            // If it is a mock execution, return mock logs
            const mockObj = MOCK_EXECUTIONS.find((ex) => ex.id === selectedExecutionId);
            if (mockObj) return mockObj.logs;

            const response = await fetch(`${API_URL}/executions/${selectedExecutionId}/logs`);
            if (!response.ok) return [];
            return response.json() as Promise<ExecutionLog[]>;
        },
        enabled: !!selectedExecutionId,
    });

    // Pick active execution matching ID
    const selectedExecution = React.useMemo(() => {
        if (!selectedExecutionId) return null;
        const mockMatch = MOCK_EXECUTIONS.find((e) => e.id === selectedExecutionId);
        if (mockMatch) return mockMatch;
        return (executionsResponse?.items || []).find((e) => e.id === selectedExecutionId) || null;
    }, [selectedExecutionId, executionsResponse]);

    // Combine database executions list + optional mock runs
    const renderedExecutions = React.useMemo(() => {
        const list = [...(executionsResponse?.items || [])];

        // If showing simulated runs or if there are no items in DB, we seed mocks for design demonstration
        if (showSimulated || list.length === 0) {
            // Filter mocks based on active filter selectors
            let filteredMocks = [...MOCK_EXECUTIONS];
            if (statusFilter !== "ALL") {
                filteredMocks = filteredMocks.filter((ex) => ex.status === statusFilter);
            }
            if (automationFilter !== "ALL") {
                filteredMocks = filteredMocks.filter((ex) => ex.automationId === automationFilter);
            }
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                filteredMocks = filteredMocks.filter(
                    (ex) =>
                        ex.id.toLowerCase().includes(query) ||
                        ex.automation.name.toLowerCase().includes(query) ||
                        ex.eventId.toLowerCase().includes(query)
                );
            }
            list.push(...filteredMocks);
        }

        // Apply Client side filters for search queries
        let finalFiltered = list;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            finalFiltered = finalFiltered.filter(
                (ex) =>
                    ex.id.toLowerCase().includes(q) ||
                    ex.eventId.toLowerCase().includes(q) ||
                    (ex.automation?.name || "Untitled Flow").toLowerCase().includes(q)
            );
        }

        // Apply date filter
        if (dateFilter !== "ALL") {
            const now = new Date();
            finalFiltered = finalFiltered.filter((ex) => {
                const d = new Date(ex.startedAt);
                const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
                if (dateFilter === "TODAY") return diffHours <= 24;
                if (dateFilter === "YESTERDAY") return diffHours > 24 && diffHours <= 48;
                if (dateFilter === "WEEK") return diffHours <= 24 * 7;
                return true;
            });
        }

        // Sort by startedAt desc
        finalFiltered.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

        return finalFiltered;
    }, [executionsResponse, statusFilter, automationFilter, searchQuery, dateFilter, showSimulated]);

    // Handle clean badge display
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "SUCCESS":
                return (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px", borderRadius: "12px", background: "var(--success-bg)", color: "var(--success)", fontSize: "11px", fontWeight: 600 }}>
                        <CheckCircle2 size={12} />
                        Success
                    </span>
                );
            case "FAILED":
                return (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px", borderRadius: "12px", background: "var(--danger-bg)", color: "var(--danger)", fontSize: "11px", fontWeight: 600 }}>
                        <XCircle size={12} />
                        Failed
                    </span>
                );
            case "WAITING":
                return (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px", borderRadius: "12px", background: "var(--warning-bg)", color: "var(--warning)", fontSize: "11px", fontWeight: 600 }}>
                        <Clock size={12} />
                        Waiting
                    </span>
                );
            case "RUNNING":
                return (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px", borderRadius: "12px", background: "#EFF6FF", color: "#3B82F6", fontSize: "11px", fontWeight: 600 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3B82F6", animation: "pulse 1.5s infinite" }} />
                        Running
                    </span>
                );
            default:
                return (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px", borderRadius: "12px", background: "var(--divider)", color: "var(--text-muted)", fontSize: "11px", fontWeight: 600 }}>
                        <Clock size={12} />
                        Queued
                    </span>
                );
        }
    };

    // Timeline Event List Builder
    const getTimelineSteps = (exec: any, logs: any[]) => {
        // Reconstruct steps from status and messages logs
        const steps: { name: string; status: "success" | "running" | "waiting" | "failed" | "skipped"; detail?: string }[] = [];

        // Trigger Type step
        const typeLabel = exec.automation?.triggerType === "REEL_COMMENT" ? "Comment Received on Reel" :
            exec.automation?.triggerType === "POST_COMMENT" ? "Comment Received on Post" :
                exec.automation?.triggerType === "DIRECT_MESSAGE" ? "Direct Message Received" :
                    exec.automation?.triggerType === "STORY_REPLY" ? "Instagram Story Reply Received" :
                        "Webhook Incoming Trigger";
        steps.push({ name: typeLabel, status: "success", detail: exec.eventId });

        // Keywords matched
        const isKeywordTrigger = exec.logs.some((l: any) => l.message.includes("matchedKeyword") || (l.metadata && l.metadata.matchedKeyword && l.metadata.matchedKeyword.length > 0));
        const isSuccess = exec.status === "SUCCESS";
        const isFailed = exec.status === "FAILED";
        const isWait = exec.status === "WAITING";

        if (exec.automation?.triggerType !== "DIRECT_MESSAGE") {
            const matchKeywordLog = exec.logs.find((l: any) => l.metadata?.matchedKeyword && l.metadata.matchedKeyword.length > 0);
            const matched = matchKeywordLog?.metadata?.matchedKeyword?.[0] || exec.variables?.["comment.text"] || "Evaluated filter criteria";
            steps.push({
                name: "Keyword Check Validated",
                status: "success",
                detail: matched ? `Match: "${matched}"` : undefined
            });
        }

        // Checking public reply steps
        const prLog = exec.logs.find((l: any) => l.message.includes("public reply") || l.metadata?.publicReplyStatus);
        if (exec.automation?.triggerType === "REEL_COMMENT" || exec.automation?.triggerType === "POST_COMMENT") {
            const prStatus = prLog?.metadata?.publicReplyStatus || (isSuccess ? "SUCCESS" : "SKIPPED");
            steps.push({
                name: "Post Auto-Reply Comment",
                status: prStatus === "SUCCESS" ? "success" : prStatus === "FAILED" ? "failed" : "skipped",
                detail: prStatus === "SUCCESS" ? "Posted reply on Instagram" : "Skipped comment auto-reply"
            });
        }

        // Checking wait delay seconds
        const waitLog = exec.logs.find((l: any) => l.message.includes("WAIT") || l.message.includes("delay"));
        if (waitLog || isWait) {
            steps.push({
                name: "Queue Pause Timeout",
                status: isWait ? "waiting" : "success",
                detail: "Wait timer active"
            });
        }

        // Message Direct message state
        const dmSentLog = exec.logs.find((l: any) => l.message.includes("SEND_MESSAGE") || l.message.includes("DM"));
        if (dmSentLog || isSuccess || isFailed) {
            steps.push({
                name: "Direct Message Dispatched",
                status: isSuccess ? "success" : isFailed ? "failed" : "running",
                detail: isFailed ? "Delivery failed" : "Direct Message Sent"
            });
        }

        // Completed node
        steps.push({
            name: isFailed ? "Workflow Failed" : isWait ? "Workflow Paused" : "Completed Successfully",
            status: isFailed ? "failed" : isWait ? "waiting" : "success",
            detail: exec.durationMs ? `Total time: ${exec.durationMs}ms` : undefined
        });

        return steps;
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Copied Execution ID to clipboard.");
    };

    // Skeletons
    const renderSkeleton = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
            {[1, 2, 3, 4, 5].map((idx) => (
                <div
                    key={idx}
                    style={{
                        height: "75px",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        display: "flex",
                        alignItems: "center",
                        padding: "0 var(--space-4)",
                        animation: "skeleton-pulse 1.8s infinite"
                    }}
                >
                    <div style={{ width: "30%", height: "16px", background: "var(--border)", borderRadius: "4px" }} />
                    <div style={{ width: "20%", height: "16px", background: "var(--border)", borderRadius: "4px", marginLeft: "auto" }} />
                    <div style={{ width: "15%", height: "16px", background: "var(--border)", borderRadius: "4px", marginLeft: "var(--space-8)" }} />
                </div>
            ))}
        </div>
    );

    return (
        <AppShell>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
                {/* Title and selector row */}
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
                            <Activity size={22} color="var(--primary)" />
                            Execution Center
                        </h1>
                        <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
                            Observe live DM trigger events, monitor webhook executions, and inspect workflow history logs.
                        </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {/* Account Selector */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 550 }}>
                                Profile:
                            </span>
                            <select
                                value={selectedAccountId || ""}
                                onChange={(e) => handleAccountChange(e.target.value)}
                                style={{
                                    padding: "6px 12px",
                                    border: "1px solid var(--border)",
                                    borderRadius: "var(--radius-md)",
                                    fontSize: "13px",
                                    color: "var(--text-primary)",
                                    background: "var(--surface)",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    outline: "none",
                                }}
                            >
                                {statusData?.accounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.pageName || acc.instagramUserId}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Toolbar Filter Deck */}
                <div
                    style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-lg)",
                        padding: "var(--space-4)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--space-4)",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: "var(--space-3)",
                        }}
                    >
                        {/* Search Input */}
                        <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
                            <Search
                                size={14}
                                color="var(--text-muted)"
                                style={{ position: "absolute", left: "12px", top: "12px" }}
                            />
                            <input
                                type="text"
                                placeholder="Search by execution ID, trigger event, workflow..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "8px 12px 8px 34px",
                                    fontSize: "13px",
                                    borderRadius: "var(--radius-md)",
                                    border: "1px solid var(--border)",
                                    background: "var(--surface-secondary)",
                                    color: "var(--text-primary)",
                                    outline: "none",
                                }}
                            />
                        </div>

                        {/* Filter by Status */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Status:</span>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: "var(--radius-md)",
                                    border: "1px solid var(--border)",
                                    background: "var(--surface-secondary)",
                                    fontSize: "12px",
                                    color: "var(--text-primary)",
                                    cursor: "pointer",
                                }}
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="SUCCESS">Success</option>
                                <option value="FAILED">Failed</option>
                                <option value="WAITING">Waiting</option>
                                <option value="RUNNING">Running</option>
                                <option value="QUEUED">Queued</option>
                            </select>
                        </div>

                        {/* Filter by Automation */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Workflow:</span>
                            <select
                                value={automationFilter}
                                onChange={(e) => setAutomationFilter(e.target.value)}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: "var(--radius-md)",
                                    border: "1px solid var(--border)",
                                    background: "var(--surface-secondary)",
                                    fontSize: "12px",
                                    color: "var(--text-primary)",
                                    cursor: "pointer",
                                    maxWidth: "200px"
                                }}
                            >
                                <option value="ALL">All Workflows</option>
                                {automationsList.map((auto) => (
                                    <option key={auto.id} value={auto.id}>
                                        {auto.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Filter by Date */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Date:</span>
                            <select
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: "var(--radius-md)",
                                    border: "1px solid var(--border)",
                                    background: "var(--surface-secondary)",
                                    fontSize: "12px",
                                    color: "var(--text-primary)",
                                    cursor: "pointer",
                                }}
                            >
                                <option value="ALL">All Time</option>
                                <option value="TODAY">Last 24 Hours</option>
                                <option value="YESTERDAY">Yesterday</option>
                                <option value="WEEK">Last 7 Days</option>
                            </select>
                        </div>
                    </div>

                    {/* Simulated Logs Checkbox */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderTop: "1px solid var(--divider)",
                            paddingTop: "var(--space-3)",
                            fontSize: "12px"
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input
                                type="checkbox"
                                id="simCheckbox"
                                checked={showSimulated}
                                onChange={(e) => setShowSimulated(e.target.checked)}
                                style={{ cursor: "pointer" }}
                            />
                            <label htmlFor="simCheckbox" style={{ cursor: "pointer", color: "var(--text-secondary)", fontWeight: 500 }}>
                                Show simulated test automation logs (Simulates live DM webhook events)
                            </label>
                        </div>

                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                            Sorted by: Started At (Descending)
                        </span>
                    </div>
                </div>

                {/* Execution Log Table view */}
                {executionsLoading ? (
                    renderSkeleton()
                ) : renderedExecutions.length === 0 ? (
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
                        }}
                    >
                        <Database size={36} color="var(--text-muted)" />
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: "8px 0 0 0" }}>
                            No executions yet
                        </h3>
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 var(--space-4) 0", maxWidth: 360 }}>
                            No automation executions found matching the current filter configurations. Connect a webhook endpoint or run simulated test logs above to begin auditing history.
                        </p>
                    </div>
                ) : (
                    <div
                        style={{
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-lg)",
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1.8fr 1.2fr 1fr 1.2fr 0.8fr 0.6fr",
                                padding: "12px 16px",
                                background: "var(--surface-secondary)",
                                borderBottom: "1px solid var(--border)",
                                fontSize: "12px",
                                fontWeight: 650,
                                color: "var(--text-secondary)",
                            }}
                        >
                            <span>AUTOMATION & EXECUTION ID</span>
                            <span>TRIGGER TYPE</span>
                            <span>EVENT ID</span>
                            <span>STARTED AT</span>
                            <span>DURATION</span>
                            <span style={{ textAlign: "right" }}>STATUS</span>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column" }}>
                            {renderedExecutions.map((exec) => {
                                const triggerType = exec.automation?.triggerType || "DIRECT_MESSAGE";
                                const dateVal = new Date(exec.startedAt);
                                const durationLabel = exec.durationMs !== null ? `${(exec.durationMs / 1000).toFixed(2)}s` : "—";
                                const isSelected = selectedExecutionId === exec.id;

                                return (
                                    <div
                                        key={exec.id}
                                        onClick={() => {
                                            setSelectedExecutionId(exec.id);
                                            setDrawerTab("details");
                                        }}
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: "1.8fr 1.2fr 1fr 1.2fr 0.8fr 0.6fr",
                                            padding: "14px 16px",
                                            borderBottom: "1px solid var(--divider)",
                                            fontSize: "13px",
                                            alignItems: "center",
                                            cursor: "pointer",
                                            background: isSelected ? "var(--hover-bg)" : "transparent",
                                            transition: "all var(--duration) var(--ease)",
                                        }}
                                        className="row-interactive"
                                    >
                                        <div style={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 }}>
                                            <span style={{ fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {exec.automation?.name || "Untitled Flow"}
                                            </span>
                                            <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "monospace" }}>
                                                {exec.id}
                                            </span>
                                        </div>

                                        <div>
                                            <span
                                                style={{
                                                    fontSize: "11px",
                                                    background: "var(--hover-bg)",
                                                    color: "var(--primary)",
                                                    padding: "2px 8px",
                                                    borderRadius: "4px",
                                                    fontWeight: 550,
                                                }}
                                            >
                                                {triggerType}
                                            </span>
                                        </div>

                                        <div style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--text-secondary)" }}>
                                            {exec.eventId.slice(0, 12)}...
                                        </div>

                                        <div style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                                            {dateVal.toLocaleDateString()} {dateVal.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}
                                        </div>

                                        <div style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                                            {durationLabel}
                                        </div>

                                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                            {getStatusBadge(exec.status)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Execution Drawer Detail Panel (Stripe-Grade Sidebar) */}
            {selectedExecution && (
                <>
                    {/* Backdrop overlay */}
                    <div
                        onClick={() => setSelectedExecutionId(null)}
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: "rgba(0, 0, 0, 0.4)",
                            backdropFilter: "blur(2px)",
                            zIndex: 999,
                            transition: "opacity 0.25s ease-in-out",
                        }}
                    />

                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            right: 0,
                            width: "600px",
                            height: "100%",
                            backgroundColor: "var(--surface)",
                            borderLeft: "1px solid var(--border)",
                            boxShadow: "var(--shadow-xl)",
                            zIndex: 1000,
                            display: "flex",
                            flexDirection: "column",
                            animation: "drawer-slide-in 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                    >
                        {/* Header */}
                        <div
                            style={{
                                padding: "20px 24px",
                                borderBottom: "1px solid var(--border)",
                                display: "flex",
                                alignItems: "flex-start",
                                justifyContent: "space-between",
                                background: "var(--surface-secondary)",
                            }}
                        >
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    Automation Log Audit Trail
                                </span>
                                <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                                    {selectedExecution.automation?.name || "Execution Trail"}
                                </h2>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                                    <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--text-muted)" }}>
                                        ID: {selectedExecution.id}
                                    </span>
                                    <button
                                        onClick={() => copyToClipboard(selectedExecution.id)}
                                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "inline-flex", padding: 2 }}
                                        title="Copy ID"
                                    >
                                        <Copy size={11} />
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                                {getStatusBadge(selectedExecution.status)}
                                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                    {selectedExecution.durationMs ? `${(selectedExecution.durationMs / 1000).toFixed(2)}s duration` : ""}
                                </span>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div
                            style={{
                                display: "flex",
                                background: "var(--surface-secondary)",
                                borderBottom: "1px solid var(--border)",
                                padding: "0 24px",
                            }}
                        >
                            {(["details", "logs", "payload", "retries"] as const).map((tab) => {
                                const isActive = drawerTab === tab;
                                const tabTitles = {
                                    details: "Overview",
                                    logs: "Console Logs",
                                    payload: "JSON Payload",
                                    retries: "Retry History"
                                };

                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setDrawerTab(tab)}
                                        style={{
                                            padding: "12px 16px",
                                            border: "none",
                                            background: "none",
                                            fontSize: "12px",
                                            fontWeight: isActive ? 600 : 500,
                                            color: isActive ? "var(--primary)" : "var(--text-secondary)",
                                            borderBottom: isActive ? "2px solid var(--primary)" : "2px solid transparent",
                                            cursor: "pointer",
                                            transition: "all 0.15s ease",
                                            marginBottom: "-1px"
                                        }}
                                    >
                                        {tabTitles[tab]}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Scrollable Content */}
                        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
                            {/* TAB 1: OVERVIEW & TIMELINE */}
                            {drawerTab === "details" && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
                                    {/* Timeline Visualizer */}
                                    <div>
                                        <h3 style={{ fontSize: "13px", fontWeight: 650, color: "var(--text-primary)", marginBottom: "var(--space-4)" }}>
                                            Event Execution Flow
                                        </h3>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                                            {getTimelineSteps(selectedExecution, selectedExecutionLogs).map((step, sIdx, arr) => {
                                                const isLast = sIdx === arr.length - 1;
                                                let iconBg = "var(--success-bg)";
                                                let iconColor = "var(--success)";
                                                if (step.status === "failed") { iconBg = "var(--danger-bg)"; iconColor = "var(--danger)"; }
                                                if (step.status === "waiting") { iconBg = "var(--warning-bg)"; iconColor = "var(--warning)"; }
                                                if (step.status === "running") { iconBg = "#EFF6FF"; iconColor = "#3B82F6"; }
                                                if (step.status === "skipped") { iconBg = "var(--divider)"; iconColor = "var(--text-muted)"; }

                                                return (
                                                    <div key={sIdx} style={{ display: "flex", gap: "14px" }}>
                                                        {/* Step line and dot */}
                                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                                            <div
                                                                style={{
                                                                    width: "24px",
                                                                    height: "24px",
                                                                    borderRadius: "50%",
                                                                    background: iconBg,
                                                                    color: iconColor,
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    fontSize: "10px",
                                                                }}
                                                            >
                                                                {step.status === "success" && <span style={{ fontWeight: "bold" }}>✓</span>}
                                                                {step.status === "failed" && <span style={{ fontWeight: "bold" }}>✗</span>}
                                                                {step.status === "waiting" && <span className="loader-dots" style={{ width: 4, height: 4, background: "var(--warning)", borderRadius: "50%" }} />}
                                                                {step.status === "skipped" && <span style={{ fontSize: 9 }}>—</span>}
                                                                {step.status === "running" && <span style={{ fontSize: 8 }}>●</span>}
                                                            </div>
                                                            {!isLast && (
                                                                <div style={{ width: "2px", flexGrow: 1, minHeight: "28px", background: "var(--border)", margin: "4px 0" }} />
                                                            )}
                                                        </div>

                                                        {/* Info */}
                                                        <div style={{ paddingBottom: isLast ? 0 : "20px", marginTop: "2px" }}>
                                                            <span style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                                                                {step.name}
                                                            </span>
                                                            {step.detail && (
                                                                <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginTop: "2px", fontFamily: "monospace" }}>
                                                                    {step.detail}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Variables Captured */}
                                    <div style={{ borderTop: "1px solid var(--divider)", paddingTop: "var(--space-4)" }}>
                                        <h3 style={{ fontSize: "13px", fontWeight: 650, color: "var(--text-primary)", marginBottom: "var(--space-3)" }}>
                                            Evaluation Variables Scope
                                        </h3>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                            {Object.entries(selectedExecution.variables || {}).map(([key, val]: any) => (
                                                <div
                                                    key={key}
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        fontSize: "12px",
                                                        padding: "6px 8px",
                                                        background: "var(--hover-bg)",
                                                        borderRadius: "var(--radius-sm)"
                                                    }}
                                                >
                                                    <span style={{ fontFamily: "monospace", color: "var(--primary)", fontWeight: 550 }}>
                                                        {key}
                                                    </span>
                                                    <span style={{ color: "var(--text-secondary)", textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "340px" }}>
                                                        {String(val)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Errors Block */}
                                    {selectedExecution.errors && (
                                        <div
                                            style={{
                                                background: "var(--danger-bg)",
                                                border: "1px solid #FECACA",
                                                borderRadius: "var(--radius-md)",
                                                padding: "16px",
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--danger)" }}>
                                                <XCircle size={16} />
                                                <span style={{ fontWeight: 600, fontSize: "13px" }}>Permanent Event Error</span>
                                            </div>
                                            <p style={{ fontSize: "12px", color: "var(--text-primary)", margin: "8px 0 0 0" }}>
                                                {selectedExecution.errors.message}
                                            </p>
                                            <pre
                                                style={{
                                                    margin: "12px 0 0 0",
                                                    padding: "10px",
                                                    background: "rgba(0, 0, 0, 0.04)",
                                                    borderRadius: "4px",
                                                    fontSize: "10px",
                                                    fontFamily: "monospace",
                                                    color: "var(--text-secondary)",
                                                    overflowX: "auto"
                                                }}
                                            >
                                                {selectedExecution.errors.stack}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 2: TERMINAL CONSOLE LOGS */}
                            {drawerTab === "logs" && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                            Terminal traces captured chronologically:
                                        </span>
                                    </div>

                                    <div
                                        style={{
                                            background: "#0F172A",
                                            borderRadius: "var(--radius-md)",
                                            padding: "16px",
                                            fontFamily: "monospace",
                                            fontSize: "11px",
                                            color: "#E2E8F0",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "12px",
                                            maxHeight: "440px",
                                            overflowY: "auto",
                                            boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.4)"
                                        }}
                                    >
                                        {selectedExecutionLogs.map((log: any, lIdx: number) => {
                                            const t = new Date(log.createdAt);
                                            const isErr = log.level === "ERROR" || log.level === "FATAL";
                                            const isWarn = log.level === "WARN";
                                            let color = "#38BDF8";
                                            if (isErr) color = "#F87171";
                                            if (isWarn) color = "#FBBF24";

                                            return (
                                                <div key={lIdx} style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                                                    <span style={{ color: "#64748B", flexShrink: 0 }}>
                                                        [{t.toLocaleTimeString([], { hour12: false })}]
                                                    </span>
                                                    <span style={{ color, fontWeight: "bold", width: "42px", flexShrink: 0 }}>
                                                        {log.level}
                                                    </span>
                                                    <div style={{ flex: 1, wordBreak: "break-all" }}>
                                                        <span>{log.message}</span>
                                                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                            <pre style={{ margin: "4px 0 0 0", color: "#94A3B8", fontSize: "10px" }}>
                                                                {JSON.stringify(log.metadata, null, 2)}
                                                            </pre>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {selectedExecutionLogs.length === 0 && (
                                            <div style={{ color: "#64748B", textAlign: "center", padding: "20px 0" }}>
                                                No console logs synchronized for this execution.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: JSON PAYLOAD VIEW */}
                            {drawerTab === "payload" && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                            Full incoming event metadata body:
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard(JSON.stringify(selectedExecution, null, 2))}
                                            style={{
                                                padding: "4px 8px",
                                                fontSize: "11px",
                                                background: "var(--hover-bg)",
                                                border: "1px solid var(--border)",
                                                borderRadius: "4px",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "4px"
                                            }}
                                        >
                                            <Copy size={11} /> Copy JSON
                                        </button>
                                    </div>

                                    <pre
                                        style={{
                                            background: "var(--hover-bg)",
                                            border: "1px solid var(--border)",
                                            borderRadius: "var(--radius-md)",
                                            padding: "16px",
                                            fontSize: "11px",
                                            fontFamily: "monospace",
                                            overflow: "auto",
                                            maxHeight: "425px",
                                            color: "var(--text-primary)",
                                        }}
                                    >
                                        {JSON.stringify(selectedExecution, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {/* TAB 4: RETRY STATISTICS HISTORY */}
                            {drawerTab === "retries" && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                    <div>
                                        <h3 style={{ fontSize: "13px", fontWeight: 650, color: "var(--text-primary)", marginBottom: "4px" }}>
                                            Queue Recurrence Status
                                        </h3>
                                        <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>
                                            This workflow employs robust exponential fallback wait policies in BullMQ for failures up to a limit of 3 efforts.
                                        </p>
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                        {selectedExecution.retries && selectedExecution.retries.map((r: any, idx: number) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    border: "1px solid var(--border)",
                                                    borderRadius: "var(--radius-md)",
                                                    padding: "12px",
                                                    background: "var(--surface-secondary)"
                                                }}
                                            >
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <span style={{ fontSize: "12px", fontWeight: 650, color: "var(--text-primary)" }}>
                                                        Retry Attempt #{r.attempt}
                                                    </span>
                                                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                                        {new Date(r.timestamp).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--danger)", margin: "6px 0 0 0", wordBreak: "break-all" }}>
                                                    {r.error}
                                                </p>
                                            </div>
                                        ))}

                                        {(!selectedExecution.retries || selectedExecution.retries.length === 0) && (
                                            <div
                                                style={{
                                                    textAlign: "center",
                                                    padding: "30px",
                                                    border: "1px dashed var(--border)",
                                                    borderRadius: "var(--radius-lg)",
                                                    color: "var(--text-muted)"
                                                }}
                                            >
                                                <RotateCcw size={20} style={{ marginBottom: "6px", opacity: 0.5 }} />
                                                <p style={{ fontSize: "12px", margin: 0 }}>
                                                    No retry events enqueued. Event executed successfully on initial attempt.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer close option */}
                        <div
                            style={{
                                padding: "16px 24px",
                                borderTop: "1px solid var(--border)",
                                display: "flex",
                                justifyContent: "flex-end",
                                background: "var(--surface-secondary)",
                            }}
                        >
                            <button
                                onClick={() => setSelectedExecutionId(null)}
                                style={{
                                    padding: "8px 16px",
                                    background: "var(--surface)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "var(--radius-md)",
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    color: "var(--text-primary)",
                                    cursor: "pointer",
                                }}
                            >
                                Close Drawer
                            </button>
                        </div>
                    </div>
                </>
            )}
        </AppShell>
    );
}
