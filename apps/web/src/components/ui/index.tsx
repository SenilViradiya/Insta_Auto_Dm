"use client";

import React, { useState, useRef, useEffect } from "react";
import {
    CheckCircle2,
    XCircle,
    Clock,
    ChevronDown,
    Trash2,
    Edit,
    Copy,
    Search,
    Compass,
    AlertCircle,
    Plus,
    HelpCircle,
    MoreHorizontal
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   1. APP SHELL - ROOT FRAMEWORK LAYOUT
   (Imported and standard wrapper handled globally)
   ═══════════════════════════════════════════════════════ */
// Note: We maintain AppShell.tsx specifically for app-wide auth/topbar scopes.

/* ═══════════════════════════════════════════════════════
   2. PAGE HEADER
   ═══════════════════════════════════════════════════════ */
interface PageHeaderProps {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, icon, actions }: PageHeaderProps) {
    return (
        <div
            style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "var(--space-4)",
                borderBottom: "1px solid var(--border)",
                paddingBottom: "var(--space-4)",
                marginBottom: "var(--space-4)",
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
                    {icon && <span style={{ display: "inline-flex", color: "var(--primary)" }}>{icon}</span>}
                    {title}
                </h1>
                {subtitle && (
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
                        {subtitle}
                    </p>
                )}
            </div>
            {actions && <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>{actions}</div>}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   3. SECTION
   ═══════════════════════════════════════════════════════ */
interface SectionProps {
    title?: string;
    description?: string;
    children: React.ReactNode;
    extra?: React.ReactNode;
    background?: string;
    border?: string;
    borderRadius?: string;
    padding?: string;
}

export function Section({
    title,
    description,
    children,
    extra,
    background = "var(--surface)",
    border = "1px solid var(--border)",
    borderRadius = "var(--radius-lg)",
    padding = "24px",
}: SectionProps) {
    return (
        <div
            style={{
                background,
                border,
                borderRadius,
                padding,
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                boxShadow: "var(--shadow-sm)",
            }}
        >
            {(title || extra) && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: description ? "none" : "1px solid var(--divider)", paddingBottom: description ? 0 : "12px" }}>
                    <div>
                        {title && <h3 style={{ fontSize: "15px", fontWeight: 650, color: "var(--text-primary)", margin: 0 }}>{title}</h3>}
                        {description && <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>{description}</p>}
                    </div>
                    {extra && <div>{extra}</div>}
                </div>
            )}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   4. WORKFLOW CARD
   ═══════════════════════════════════════════════════════ */
interface WorkflowCardProps {
    name: string;
    triggerType: string;
    enabled: boolean;
    runs?: number;
    successRate?: string;
    lastRun?: string;
    triggerIcon?: React.ReactNode;
    onEdit?: () => void;
    onToggle?: (val: boolean) => void;
    onDelete?: () => void;
}

export function WorkflowCard({
    name,
    triggerType,
    enabled,
    runs = 0,
    successRate = "100%",
    lastRun = "Never run",
    triggerIcon,
    onEdit,
    onToggle,
    onDelete,
}: WorkflowCardProps) {
    return (
        <div
            style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-5)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
                position: "relative",
            }}
            className="card-interactive"
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                    <h2
                        style={{
                            fontSize: 15,
                            fontWeight: 650,
                            color: "var(--text-primary)",
                            margin: 0,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {name}
                    </h2>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                        {triggerIcon}
                        Trigger: {triggerType}
                    </span>
                </div>

                {/* Toggle Switch */}
                {onToggle && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: enabled ? "var(--success)" : "var(--text-muted)" }}>
                            {enabled ? "Active" : "Paused"}
                        </span>
                        <button
                            onClick={() => onToggle(!enabled)}
                            style={{
                                width: 32,
                                height: 18,
                                borderRadius: 9,
                                background: enabled ? "var(--primary)" : "var(--border)",
                                border: "none",
                                position: "relative",
                                cursor: "pointer",
                                padding: 0,
                                transition: "background var(--duration) var(--ease)"
                            }}
                            aria-label="Toggle status"
                            type="button"
                        >
                            <div
                                style={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: "50%",
                                    background: "#fff",
                                    position: "absolute",
                                    top: 2,
                                    left: enabled ? 16 : 2,
                                    transition: "left var(--duration) var(--ease)"
                                }}
                            />
                        </button>
                    </div>
                )}
            </div>

            {/* Metrics Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", background: "var(--surface-secondary)", padding: "10px 12px", borderRadius: "var(--radius-md)", fontSize: 11 }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ color: "var(--text-muted)" }}>Runs</span>
                    <strong style={{ fontSize: 12, color: "var(--text-primary)" }}>{runs}</strong>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ color: "var(--text-muted)" }}>Success</span>
                    <strong style={{ fontSize: 12, color: "var(--success)" }}>{successRate}</strong>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ color: "var(--text-muted)" }}>Last Occurred</span>
                    <strong style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lastRun}</strong>
                </div>
            </div>

            {/* Action Buttons Footer */}
            <div style={{ display: "flex", gap: "var(--space-2)", borderTop: "1px solid var(--divider)", paddingTop: "var(--space-3)", marginTop: "auto" }}>
                {onEdit && (
                    <button
                        onClick={onEdit}
                        style={{
                            flex: 1,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            padding: "6px 12px",
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-md)",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                            cursor: "pointer",
                            transition: "all var(--duration) var(--ease)"
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-secondary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface)"; }}
                        type="button"
                    >
                        <Edit size={12} />
                        Configure Page
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={onDelete}
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
                            color: "var(--text-muted)",
                            transition: "all var(--duration) var(--ease)"
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "rgba(220,38,38,0.15)";
                            e.currentTarget.style.color = "var(--danger)";
                            e.currentTarget.style.background = "var(--danger-bg)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--border)";
                            e.currentTarget.style.color = "var(--text-muted)";
                            e.currentTarget.style.background = "var(--surface)";
                        }}
                        title="Delete this workflow"
                        aria-label="Delete flow"
                        type="button"
                    >
                        <Trash2 size={13} />
                    </button>
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   5. METRIC CARD
   ═══════════════════════════════════════════════════════ */
interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle: string;
    icon?: React.ReactNode;
    trend?: {
        value: string;
        positive: boolean;
    };
}

export function MetricCard({ title, value, subtitle, icon, trend }: MetricCardProps) {
    return (
        <div
            style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                minWidth: "220px",
                boxShadow: "var(--shadow-sm)"
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: 550, color: "var(--text-secondary)" }}>{title}</span>
                {icon && <div style={{ color: "var(--primary)" }}>{icon}</div>}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                    {value}
                </span>
                {trend && (
                    <span
                        style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: trend.positive ? "var(--success)" : "var(--danger)",
                            background: trend.positive ? "var(--success-bg)" : "var(--danger-bg)",
                            padding: "2px 6px",
                            borderRadius: "4px"
                        }}
                    >
                        {trend.value}
                    </span>
                )}
            </div>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{subtitle}</span>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   6. INFO CARD
   ═══════════════════════════════════════════════════════ */
interface InfoCardProps {
    title: string;
    value?: string | number;
    icon?: React.ReactNode;
    status?: "success" | "warning" | "danger" | "info" | "neutral";
    statusLabel?: string;
    children?: React.ReactNode;
}

export function InfoCard({ title, value, icon, status = "success", statusLabel, children }: InfoCardProps) {
    const getBadgeColors = () => {
        switch (status) {
            case "success":
                return { bg: "var(--success-bg)", text: "var(--success)", border: "#DCFCE7", dot: "var(--success)" };
            case "warning":
                return { bg: "var(--warning-bg)", text: "var(--warning)", border: "#FEF3C7", dot: "var(--warning)" };
            case "danger":
                return { bg: "var(--danger-bg)", text: "var(--danger)", border: "#FEE2E2", dot: "var(--danger)" };
            case "info":
                return { bg: "#EFF6FF", text: "#1D4ED8", border: "#DBEAFE", dot: "#3B82F6" };
            default:
                return { bg: "var(--surface-secondary)", text: "var(--text-secondary)", border: "var(--border)", dot: "var(--text-muted)" };
        }
    };

    const badge = getBadgeColors();

    return (
        <div
            style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                boxShadow: "var(--shadow-sm)"
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {icon && <span style={{ color: "var(--text-secondary)" }}>{icon}</span>}
                    <span style={{ fontSize: "13px", fontWeight: 650, color: "var(--text-primary)" }}>{title}</span>
                </div>
                {statusLabel && (
                    <span
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 650,
                            background: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`
                        }}
                    >
                        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: badge.dot }} />
                        {statusLabel}
                    </span>
                )}
            </div>
            {(value !== undefined || children) && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {value !== undefined && (
                        <span style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>
                            {value}
                        </span>
                    )}
                    {children}
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   7. FORM SECTION
   ═══════════════════════════════════════════════════════ */
interface FormSectionProps {
    title: string;
    description?: string;
    children: React.ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "24px",
                padding: "24px 0",
                borderBottom: "1px solid var(--border)"
            }}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <h4 style={{ fontSize: "14px", fontWeight: 650, color: "var(--text-primary)", margin: 0 }}>
                    {title}
                </h4>
                {description && (
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                        {description}
                    </p>
                )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {children}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   8. TOOLBAR
   ═══════════════════════════════════════════════════════ */
export function Toolbar({ children }: { children: React.ReactNode }) {
    return (
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
            {children}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   9. STATUS BADGE
   ═══════════════════════════════════════════════════════ */
interface StatusBadgeProps {
    status: "SUCCESS" | "FAILED" | "WAITING" | "RUNNING" | "QUEUED" | string;
    label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
    const norm = status.toUpperCase();
    const getBadgeStyle = () => {
        switch (norm) {
            case "SUCCESS":
                return { bg: "var(--success-bg)", text: "var(--success)", border: "transparent", dot: "var(--success)" };
            case "FAILED":
                return { bg: "var(--danger-bg)", text: "var(--danger)", border: "transparent", dot: "var(--danger)" };
            case "WAITING":
                return { bg: "var(--warning-bg)", text: "var(--warning)", border: "transparent", dot: "var(--warning)" };
            case "RUNNING":
                return { bg: "#EFF6FF", text: "#3B82F6", border: "transparent", dot: "#3B82F6", animate: true };
            default:
                return { bg: "var(--surface-secondary)", text: "var(--text-secondary)", border: "var(--border)", dot: "var(--text-muted)" };
        }
    };

    const badge = getBadgeStyle();
    const title = label || status.charAt(0) + status.slice(1).toLowerCase();

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 8px",
                borderRadius: "12px",
                background: badge.bg,
                color: badge.text,
                border: badge.border !== "transparent" ? `1px solid ${badge.border}` : "none",
                fontSize: "11px",
                fontWeight: 600,
                width: "fit-content",
            }}
        >
            <span
                style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: badge.dot,
                    animation: badge.animate ? "pulse 1.5s infinite" : "none",
                }}
            />
            {title}
        </span>
    );
}

/* ═══════════════════════════════════════════════════════
   10. EMPTY STATE
   ═══════════════════════════════════════════════════════ */
interface EmptyStateProps {
    title: string;
    description: string;
    icon?: React.ReactNode;
    actionLabel?: string;
    onAction?: () => void;
}

export function EmptyState({ title, description, icon, actionLabel, onAction }: EmptyStateProps) {
    return (
        <div
            style={{
                padding: "var(--space-10) var(--space-4)",
                textAlign: "center",
                border: "1px dashed var(--border)",
                borderRadius: "var(--radius-lg)",
                background: "var(--surface)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
            }}
        >
            {icon ? (
                <div style={{ color: "var(--text-muted)", display: "flex", justifyContent: "center" }}>{icon}</div>
            ) : (
                <Compass size={24} color="var(--text-muted)" />
            )}
            <span style={{ fontSize: 13, fontWeight: 650, color: "var(--text-primary)" }}>
                {title}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: "280px", lineHeight: 1.5 }}>
                {description}
            </span>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    style={{
                        marginTop: "var(--space-2)",
                        padding: "8px 16px",
                        background: "var(--primary)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "var(--radius-md)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "background var(--duration) var(--ease)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "var(--primary)"; }}
                    type="button"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   11. LOADING SKELETON
   ═══════════════════════════════════════════════════════ */
interface LoadingSkeletonProps {
    variant?: "text" | "title" | "card" | "builder" | "table";
    count?: number;
}

export function LoadingSkeleton({ variant = "card", count = 1 }: LoadingSkeletonProps) {
    const items = Array.from({ length: count });

    if (variant === "text") {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                {items.map((_, i) => (
                    <div key={i} className="skeleton skeleton-text" style={{ width: i === count - 1 ? "60%" : "100%" }} />
                ))}
            </div>
        );
    }

    if (variant === "title") {
        return <div className="skeleton skeleton-title" style={{ width: "200px" }} />;
    }

    if (variant === "table") {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px", width: "100%" }}>
                {items.map((_, i) => (
                    <div
                        key={i}
                        style={{
                            height: "52px",
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-md)",
                            display: "flex",
                            alignItems: "center",
                            padding: "0 var(--space-4)",
                        }}
                    >
                        <div style={{ width: "30%", height: "14px", background: "var(--border)", borderRadius: "4px" }} className="skeleton" />
                        <div style={{ width: "20%", height: "14px", background: "var(--border)", borderRadius: "4px", marginLeft: "auto" }} className="skeleton" />
                        <div style={{ width: "15%", height: "14px", background: "var(--border)", borderRadius: "4px", marginLeft: "var(--space-8)" }} className="skeleton" />
                    </div>
                ))}
            </div>
        );
    }

    if (variant === "builder") {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "var(--space-4)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", width: "60%" }}>
                        <div style={{ width: "30%", height: "24px" }} className="skeleton" />
                        <div style={{ width: "50%", height: "12px", marginTop: "4px" }} className="skeleton" />
                    </div>
                    <div style={{ width: "120px", height: "36px", borderRadius: "var(--radius-md)" }} className="skeleton" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr", gap: "var(--space-6)" }}>
                    <div style={{ padding: "var(--space-5)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", background: "var(--surface)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                        <div style={{ width: "40%", height: "16px" }} className="skeleton" />
                        <div style={{ width: "100%", height: "40px" }} className="skeleton" />
                        <div style={{ width: "100%", height: "60px" }} className="skeleton" />
                        <div style={{ width: "100%", height: "40px" }} className="skeleton" />
                    </div>
                    <div style={{ padding: "var(--space-6)", border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)", background: "var(--surface-secondary)", minHeight: "360px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "var(--space-5)" }}>
                        <div style={{ width: "56px", height: "56px", borderRadius: "50%" }} className="skeleton" />
                        <div style={{ width: "180px", height: "16px" }} className="skeleton" />
                        <div style={{ width: "130px", height: "12px" }} className="skeleton" />
                    </div>
                </div>
            </div>
        );
    }

    // default card skeleton
    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            {items.map((_, i) => (
                <div
                    key={i}
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
    );
}

/* ═══════════════════════════════════════════════════════
   12. TIMELINE
   ═══════════════════════════════════════════════════════ */
interface TimelineStep {
    name: string;
    status: "success" | "running" | "waiting" | "failed" | "skipped";
    detail?: string;
}

interface TimelineProps {
    steps: TimelineStep[];
}

export function Timeline({ steps }: TimelineProps) {
    const getStepIcon = (status: string) => {
        switch (status) {
            case "success":
                return <CheckCircle2 size={12} color="var(--success)" />;
            case "failed":
                return <XCircle size={12} color="var(--danger)" />;
            case "waiting":
                return <Clock size={12} color="var(--warning)" />;
            case "running":
                return <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--primary)", animation: "pulse 1.2s infinite" }} />;
            default:
                return <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-muted)" }} />;
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", position: "relative", paddingLeft: "12px" }}>
            {steps.map((step, idx) => {
                const isLast = idx === steps.length - 1;
                return (
                    <div key={idx} style={{ display: "flex", gap: "12px", paddingBottom: 16, position: "relative" }}>
                        {/* Draw Vertical Line segments */}
                        {!isLast && (
                            <div
                                style={{
                                    position: "absolute",
                                    left: "5px",
                                    top: "16px",
                                    bottom: "-6px",
                                    width: "1px",
                                    background: "var(--border)",
                                    zIndex: 0
                                }}
                            />
                        )}

                        {/* Icon pin */}
                        <div
                            style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "50%",
                                background: "var(--surface)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 1,
                                marginTop: "3px"
                            }}
                        >
                            {getStepIcon(step.status)}
                        </div>

                        {/* Content text */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px", paddingBottom: "16px" }}>
                            <span
                                style={{
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    color: step.status === "failed" ? "var(--danger)" : step.status === "skipped" ? "var(--text-muted)" : "var(--text-primary)"
                                }}
                            >
                                {step.name}
                            </span>
                            {step.detail && (
                                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                                    {step.detail}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   13. DRAWER HEADER
   ═══════════════════════════════════════════════════════ */
interface DrawerHeaderProps {
    title: string;
    subtitle?: string;
    onClose: () => void;
    extra?: React.ReactNode;
}

export function DrawerHeader({ title, subtitle, onClose, extra }: DrawerHeaderProps) {
    return (
        <div
            style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
            }}
        >
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h2 style={{ fontSize: "16px", fontWeight: 650, color: "var(--text-primary)", margin: 0 }}>
                        {title}
                    </h2>
                    {extra}
                </div>
                {subtitle && (
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
                        {subtitle}
                    </p>
                )}
            </div>
            <button
                onClick={onClose}
                style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "var(--radius-sm)",
                    transition: "background var(--duration) var(--ease)"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-secondary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                aria-label="Close drawer"
                type="button"
            >
                <span style={{ fontSize: "16px", lineHeight: 1 }}>&times;</span>
            </button>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   14. DATA GRID (TABLE)
   ═══════════════════════════════════════════════════════ */
interface DataGridColumn<T> {
    title: string;
    key: string;
    render?: (row: T) => React.ReactNode;
    style?: React.CSSProperties;
}

interface DataGridProps<T> {
    columns: DataGridColumn<T>[];
    data: T[];
    keyField: keyof T | ((row: T) => string);
    isLoading?: boolean;
    emptyMessage?: string;
    onRowClick?: (row: T) => void;
}

export function DataGrid<T>({
    columns,
    data,
    keyField,
    isLoading = false,
    emptyMessage = "No records found.",
    onRowClick,
}: DataGridProps<T>) {
    const getRowKey = (row: T): string => {
        if (typeof keyField === "function") {
            return keyField(row);
        }
        return String(row[keyField]);
    };

    return (
        <div
            style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                background: "var(--surface)",
                width: "100%",
                overflow: "hidden",
                boxShadow: "var(--shadow-sm)",
            }}
        >
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ background: "var(--surface-secondary)", borderBottom: "1px solid var(--border)" }}>
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    style={{
                                        padding: "12px 16px",
                                        fontSize: "12px",
                                        fontWeight: 600,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.04em",
                                        color: "var(--text-secondary)",
                                        ...col.style,
                                    }}
                                >
                                    {col.title}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={columns.length} style={{ padding: "0 16px" }}>
                                    <LoadingSkeleton variant="table" count={5} />
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} style={{ padding: "40px 16px", textAlign: "center" }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", color: "var(--text-muted)" }}>
                                        <Compass size={24} />
                                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{emptyMessage}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            data.map((row) => {
                                const key = getRowKey(row);
                                return (
                                    <tr
                                        key={key}
                                        onClick={() => onRowClick && onRowClick(row)}
                                        style={{
                                            borderBottom: "1px solid var(--divider)",
                                            cursor: onRowClick ? "pointer" : "default",
                                            transition: "background var(--duration) var(--ease)",
                                        }}
                                        onMouseEnter={(e) => { if (onRowClick) e.currentTarget.style.background = "var(--hover-bg)"; }}
                                        onMouseLeave={(e) => { if (onRowClick) e.currentTarget.style.background = "transparent"; }}
                                    >
                                        {columns.map((col, idx) => (
                                            <td
                                                key={idx}
                                                style={{
                                                    padding: "12px 16px",
                                                    fontSize: "13px",
                                                    color: "var(--text-primary)",
                                                    ...col.style,
                                                }}
                                            >
                                                {col.render ? col.render(row) : String((row as any)[col.key])}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   15. FILTER BAR
   ═══════════════════════════════════════════════════════ */
export function FilterBar({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "var(--space-3)",
            }}
        >
            {children}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   16. SEARCH INPUT
   ═══════════════════════════════════════════════════════ */
interface SearchInputProps {
    placeholder?: string;
    value: string;
    onChange: (val: string) => void;
    style?: React.CSSProperties;
}

export function SearchInput({ placeholder = "Search...", value, onChange, style }: SearchInputProps) {
    return (
        <div style={{ position: "relative", flex: 1, minWidth: "240px", ...style }}>
            <Search
                size={14}
                color="var(--text-muted)"
                style={{ position: "absolute", left: "12px", top: "12px" }}
            />
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    width: "100%",
                    padding: "8px 12px 8px 34px",
                    fontSize: "13px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    background: "var(--surface-secondary)",
                    color: "var(--text-primary)",
                    outline: "none",
                    transition: "all var(--duration) var(--ease)"
                }}
                onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--primary)";
                    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37, 99, 235, 0.08)";
                }}
                onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.boxShadow = "none";
                }}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   17. ACTION MENU
   ═══════════════════════════════════════════════════════ */
interface ActionMenuItem {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
}

interface ActionMenuProps {
    actions: ActionMenuItem[];
    trigger?: React.ReactNode;
}

export function ActionMenu({ actions, trigger }: ActionMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
            <div onClick={() => setIsOpen(!isOpen)} style={{ cursor: "pointer" }}>
                {trigger || (
                    <button
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "28px",
                            height: "28px",
                            background: "transparent",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--text-secondary)",
                        }}
                        type="button"
                    >
                        <MoreHorizontal size={14} />
                    </button>
                )}
            </div>

            {isOpen && (
                <div
                    style={{
                        position: "absolute",
                        right: 0,
                        top: "100%",
                        marginTop: "4px",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        boxShadow: "var(--shadow-md)",
                        zIndex: 100,
                        minWidth: "140px",
                        padding: "4px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                    }}
                >
                    {actions.map((item, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                item.onClick();
                                setIsOpen(false);
                            }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                width: "100%",
                                padding: "6px 8px",
                                border: "none",
                                borderRadius: "var(--radius-sm)",
                                background: "transparent",
                                color: item.danger ? "var(--danger)" : "var(--text-primary)",
                                fontSize: "12px",
                                cursor: "pointer",
                                textAlign: "left",
                                transition: "background var(--duration) var(--ease)"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = item.danger ? "var(--danger-bg)" : "var(--surface-secondary)";
                            }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                            type="button"
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   18. DOCUMENT PANEL
   ═══════════════════════════════════════════════════════ */
interface DocumentPanelItem {
    label: string;
    value: React.ReactNode;
}

interface DocumentPanelProps {
    title: string;
    items: DocumentPanelItem[];
    children?: React.ReactNode;
}

export function DocumentPanel({ title, items, children }: DocumentPanelProps) {
    return (
        <div
            style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                boxShadow: "var(--shadow-sm)"
            }}
        >
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", borderBottom: "1px solid var(--divider)", paddingBottom: "8px" }}>
                {title}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {items.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: "12px" }}>
                        <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{item.label}</span>
                        <span style={{ color: "var(--text-primary)", fontWeight: 600, textAlign: "right", maxWidth: "70%" }}>{item.value}</span>
                    </div>
                ))}
            </div>
            {children}
        </div>
    );
}
