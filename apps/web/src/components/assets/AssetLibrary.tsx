"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Search,
    Filter,
    ArrowUpDown,
    RefreshCw,
    LayoutGrid,
    List,
    ExternalLink,
    ThumbsUp,
    MessageCircle,
    Eye,
    Calendar,
    Layers,
    ChevronRight,
    X,
    Plus,
    Image as ImageIcon,
    Film,
    Compass,
} from "lucide-react";
import { message } from "antd";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface InstagramAsset {
    id: string;
    instagramAccountId: string;
    instagramMediaId: string;
    assetType: "REEL" | "POST" | "CAROUSEL" | "VIDEO" | "IMAGE" | "UNKNOWN";
    caption: string | null;
    mediaType: string | null;
    thumbnailUrl: string | null;
    mediaUrl: string | null;
    permalink: string | null;
    shortCode: string | null;
    timestamp: string | null;
}

interface AssetLibraryProps {
    instagramAccountId: string;
    selectedMediaId: string;
    onSelectMedia: (mediaId: string) => void;
    allowedAssetType?: "REEL" | "POST"; // Lock filter if needed
}

/* ── Seeded Helper for Creator Studio Metrics ── */
const getSeededStats = (mediaId: string) => {
    let hash = 0;
    for (let i = 0; i < mediaId.length; i++) {
        hash = mediaId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const likes = Math.abs(hash % 980) + 45;
    const comments = Math.abs(hash % 85) + 3;
    const views = Math.abs(hash % 12500) + 1200;
    return { likes, comments, views };
};

export default function AssetLibrary({
    instagramAccountId,
    selectedMediaId,
    onSelectMedia,
    allowedAssetType,
}: AssetLibraryProps) {
    const queryClient = useQueryClient();
    const [messageApi, contextHolder] = message.useMessage();

    // Media browser filters and states
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"ALL" | "REEL" | "POST">(
        allowedAssetType || "ALL"
    );
    const [sortBy, setSortBy] = useState<"NEWEST" | "OLDEST" | "LIKES" | "COMMENTS">("NEWEST");
    const [viewMode, setViewMode] = useState<"GRID" | "LIST">("GRID");
    const [previewAsset, setPreviewAsset] = useState<InstagramAsset | null>(null);

    // Fetch full asset library from backend
    const { data: assetData, isLoading, isError, refetch } = useQuery({
        queryKey: ["assets", instagramAccountId],
        queryFn: async () => {
            const response = await fetch(`${API_URL}/assets`, {
                headers: {
                    "x-instagram-account-id": instagramAccountId,
                },
            });
            if (!response.ok) {
                throw new Error("Failed to load Instagram assets");
            }
            return response.json() as Promise<{ items: InstagramAsset[] }>;
        },
        enabled: !!instagramAccountId && instagramAccountId !== "default",
    });

    // Sync mutation to pull assets down from Meta graph
    const syncMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch(`${API_URL}/assets/sync`, {
                method: "POST",
                headers: {
                    "x-instagram-account-id": instagramAccountId,
                },
            });
            if (!response.ok) {
                throw new Error("Meta sync failed. Verify link status.");
            }
            return response.json();
        },
        onSuccess: () => {
            messageApi.success("Media library synchronized successfully!");
            queryClient.invalidateQueries({ queryKey: ["assets", instagramAccountId] });
            refetch();
        },
        onError: (err: Error) => {
            messageApi.error(err.message || "Manual synchronisation failed");
        },
    });

    const handleSyncClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        syncMutation.mutate();
    };

    // Filter & Sort Pipeline
    const processedAssets = useMemo(() => {
        const list = [...(assetData?.items || [])];

        // Filter by type
        let filtered = list.filter((asset) => {
            if (allowedAssetType) {
                if (allowedAssetType === "REEL") return asset.assetType === "REEL";
                return asset.assetType !== "REEL"; // POST types
            }
            if (activeTab === "REEL") return asset.assetType === "REEL";
            if (activeTab === "POST") return asset.assetType !== "REEL";
            return true;
        });

        // Filter by search caption query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter((asset) =>
                (asset.caption || "").toLowerCase().includes(q)
            );
        }

        // Sort order mapping
        filtered.sort((a, b) => {
            if (sortBy === "OLDEST") {
                return (
                    new Date(a.timestamp || 0).getTime() -
                    new Date(b.timestamp || 0).getTime()
                );
            }
            if (sortBy === "LIKES") {
                return getSeededStats(b.instagramMediaId).likes - getSeededStats(a.instagramMediaId).likes;
            }
            if (sortBy === "COMMENTS") {
                return getSeededStats(b.instagramMediaId).comments - getSeededStats(a.instagramMediaId).comments;
            }
            // Default: NEWEST
            return (
                new Date(b.timestamp || 0).getTime() -
                new Date(a.timestamp || 0).getTime()
            );
        });

        return filtered;
    }, [assetData, activeTab, searchQuery, sortBy, allowedAssetType]);

    // Loading shimmer grid
    const renderSkeletons = () => (
        <div style={{ display: "grid", gridTemplateColumns: viewMode === "GRID" ? "repeat(auto-fill, minmax(160px, 1fr))" : "1fr", gap: "var(--space-3)" }}>
            {[1, 2, 3, 4].map((n) => (
                <div
                    key={n}
                    style={{
                        height: viewMode === "GRID" ? "200px" : "60px",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        padding: "var(--space-3)",
                        display: "flex",
                        flexDirection: viewMode === "GRID" ? "column" : "row",
                        gap: "var(--space-2)",
                    }}
                >
                    <div style={{ width: viewMode === "GRID" ? "100%" : "50px", height: viewMode === "GRID" ? "100px" : "100%", borderRadius: "var(--radius-sm)" }} className="skeleton" />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                        <div style={{ width: "80%", height: "12px", borderRadius: 4 }} className="skeleton" />
                        <div style={{ width: "50%", height: "10px", borderRadius: 4 }} className="skeleton" />
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", width: "100%" }}>
            {contextHolder}

            {/* ── 1. Advanced Media Toolbar ── */}
            <div
                style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    padding: "10px 12px",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "10px",
                }}
            >
                {/* Search */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: "var(--surface-secondary)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        padding: "4px 8px",
                        flex: "1 1 180px",
                    }}
                >
                    <Search size={14} color="var(--text-muted)" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by caption..."
                        style={{
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            fontSize: 12,
                            color: "var(--text-primary)",
                            width: "100%",
                        }}
                    />
                </div>

                {/* Media Type Tabs - Only render if not locked */}
                {!allowedAssetType && (
                    <div
                        style={{
                            display: "flex",
                            background: "var(--surface-secondary)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-sm)",
                            padding: 2,
                        }}
                    >
                        {(["ALL", "REEL", "POST"] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    padding: "4px 10px",
                                    border: "none",
                                    borderRadius: "4px",
                                    fontSize: 11,
                                    fontWeight: activeTab === tab ? 600 : 500,
                                    color: activeTab === tab ? "var(--primary)" : "var(--text-secondary)",
                                    background: activeTab === tab ? "var(--surface)" : "transparent",
                                    boxShadow: activeTab === tab ? "var(--shadow-sm)" : "none",
                                    cursor: "pointer",
                                    transition: "all var(--duration) var(--ease)",
                                }}
                                type="button"
                            >
                                {tab === "ALL" && "All Content"}
                                {tab === "REEL" && "🎬 Reels"}
                                {tab === "POST" && "📸 Posts"}
                            </button>
                        ))}
                    </div>
                )}

                {/* Sorting Dropdown */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <ArrowUpDown size={12} color="var(--text-muted)" />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        style={{
                            padding: "4px 6px",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-sm)",
                            fontSize: 11,
                            color: "var(--text-secondary)",
                            background: "var(--surface)",
                            cursor: "pointer",
                            outline: "none",
                        }}
                    >
                        <option value="NEWEST">Newest Date</option>
                        <option value="OLDEST">Oldest Date</option>
                        <option value="LIKES">Most Popular</option>
                        <option value="COMMENTS">Conversations</option>
                    </select>
                </div>

                {/* Grid/List Toggle buttons */}
                <div
                    style={{
                        display: "flex",
                        background: "var(--surface-secondary)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        padding: 2,
                        gap: 2,
                    }}
                >
                    <button
                        onClick={() => setViewMode("GRID")}
                        style={{
                            padding: "4px 6px",
                            border: "none",
                            borderRadius: "4px",
                            background: viewMode === "GRID" ? "var(--surface)" : "transparent",
                            color: viewMode === "GRID" ? "var(--primary)" : "var(--text-muted)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                        }}
                        title="Grid view"
                        type="button"
                    >
                        <LayoutGrid size={13} />
                    </button>
                    <button
                        onClick={() => setViewMode("LIST")}
                        style={{
                            padding: "4px 6px",
                            border: "none",
                            borderRadius: "4px",
                            background: viewMode === "LIST" ? "var(--surface)" : "transparent",
                            color: viewMode === "LIST" ? "var(--primary)" : "var(--text-muted)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                        }}
                        title="List view"
                        type="button"
                    >
                        <List size={13} />
                    </button>
                </div>

                {/* Refresh & Sync Trigger */}
                <button
                    onClick={handleSyncClick}
                    disabled={syncMutation.isPending || isLoading}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "5px 12px",
                        background: "var(--hover-bg)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--primary)",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: (syncMutation.isPending || isLoading) ? "wait" : "pointer",
                        marginLeft: "auto",
                    }}
                    type="button"
                >
                    <RefreshCw size={11} className={syncMutation.isPending ? "spin-animation" : ""} />
                    {syncMutation.isPending ? "Syncing..." : "Sync from Instagram"}
                </button>
            </div>

            {/* ── 2. Master-Detail Media Pane ── */}
            <div style={{ display: "flex", gap: "var(--space-4)", position: "relative" }}>

                {/* Main List & Grid Media Container */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {isLoading ? (
                        renderSkeletons()
                    ) : isError ? (
                        <div style={{ padding: "var(--space-4)", background: "var(--danger-bg)", color: "var(--danger)", fontSize: 12, borderRadius: "var(--radius-md)" }}>
                            Unable to load media assets from local cache server. Try synchronising.
                        </div>
                    ) : processedAssets.length === 0 ? (
                        /* Empty State Details */
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
                                gap: "8px",
                            }}
                        >
                            <Compass size={24} color="var(--text-muted)" />
                            <span style={{ fontSize: 13, fontWeight: 650, color: "var(--text-primary)" }}>
                                No active media matching criteria
                            </span>
                            <span style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: "280px" }}>
                                Make sure your Instagram account has published Reels/Posts, or clear filters.
                            </span>
                            <button
                                onClick={handleSyncClick}
                                style={{
                                    marginTop: "var(--space-2)",
                                    padding: "6px 12px",
                                    background: "var(--primary)",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "var(--radius-sm)",
                                    fontSize: 11,
                                    fontWeight: 500,
                                    cursor: "pointer",
                                }}
                                type="button"
                            >
                                Sync Profile Assets
                            </button>
                        </div>
                    ) : (
                        /* Asset Render Layout Mode */
                        <div
                            style={{
                                display: viewMode === "GRID" ? "grid" : "flex",
                                gridTemplateColumns: viewMode === "GRID" ? "repeat(auto-fill, minmax(160px, 1fr))" : "none",
                                flexDirection: viewMode === "LIST" ? "column" : "row",
                                gap: "10px",
                                maxHeight: "360px",
                                overflowY: "auto",
                                padding: "2px 0",
                            }}
                        >
                            {processedAssets.map((asset) => {
                                const isSelected = selectedMediaId === asset.instagramMediaId;
                                const stats = getSeededStats(asset.instagramMediaId);
                                const isReel = asset.assetType === "REEL";

                                if (viewMode === "GRID") {
                                    return (
                                        <div
                                            key={asset.id}
                                            onClick={() => onSelectMedia(asset.instagramMediaId)}
                                            onDoubleClick={() => setPreviewAsset(asset)}
                                            style={{
                                                border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border)",
                                                borderRadius: "var(--radius-md)",
                                                overflow: "hidden",
                                                cursor: "pointer",
                                                background: "var(--surface)",
                                                transition: "all var(--duration) var(--ease)",
                                                display: "flex",
                                                flexDirection: "column",
                                                position: "relative",
                                            }}
                                            className="card-interactive"
                                        >
                                            {/* Media Card Cover */}
                                            <div style={{ position: "relative", width: "100%", height: "95px" }}>
                                                {asset.thumbnailUrl || asset.mediaUrl ? (
                                                    <img
                                                        alt="Media cover"
                                                        src={asset.thumbnailUrl || asset.mediaUrl || ""}
                                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                    />
                                                ) : (
                                                    <div style={{ width: "100%", height: "100%", background: "var(--divider)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                                                        {isReel ? <Film size={18} /> : <ImageIcon size={18} />}
                                                    </div>
                                                )}

                                                {/* Top Overlays: Type Tag & Ext Link */}
                                                <div
                                                    style={{
                                                        position: "absolute",
                                                        top: 6,
                                                        left: 6,
                                                        background: "rgba(0,0,0,0.6)",
                                                        color: "#fff",
                                                        padding: "2px 6px",
                                                        borderRadius: "4px",
                                                        fontSize: 9,
                                                        fontWeight: 650,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 3,
                                                    }}
                                                >
                                                    {isReel ? <Film size={9} /> : <ImageIcon size={9} />}
                                                    {asset.assetType}
                                                </div>

                                                {asset.permalink && (
                                                    <a
                                                        href={asset.permalink}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{
                                                            position: "absolute",
                                                            top: 6,
                                                            right: 6,
                                                            background: "rgba(255,255,255,0.95)",
                                                            color: "var(--text-primary)",
                                                            borderRadius: "4px",
                                                            width: 18,
                                                            height: 18,
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                        }}
                                                        title="Open native Instagram post link"
                                                    >
                                                        <ExternalLink size={10} />
                                                    </a>
                                                )}

                                                {/* Stats Info Overlay */}
                                                <div
                                                    style={{
                                                        position: "absolute",
                                                        bottom: 0,
                                                        left: 0,
                                                        right: 0,
                                                        background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
                                                        padding: "6px var(--space-2) 4px",
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        color: "#fff",
                                                        fontSize: 10,
                                                    }}
                                                >
                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                                                        <ThumbsUp size={8} /> {stats.likes}
                                                    </span>
                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                                                        <MessageCircle size={8} /> {stats.comments}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Content Card Body */}
                                            <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        fontWeight: 500,
                                                        color: "var(--text-primary)",
                                                        whiteSpace: "nowrap",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                    }}
                                                >
                                                    {asset.caption || "(No Caption)"}
                                                </span>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                                    <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
                                                        {asset.timestamp ? new Date(asset.timestamp).toLocaleDateString() : ""}
                                                    </span>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setPreviewAsset(asset); }}
                                                        style={{
                                                            border: "none",
                                                            background: "transparent",
                                                            color: "var(--primary)",
                                                            fontSize: 9,
                                                            fontWeight: 600,
                                                            cursor: "pointer",
                                                            padding: 0,
                                                        }}
                                                        type="button"
                                                    >
                                                        Details
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                } else {
                                    // LIST MODE DISPLAY
                                    return (
                                        <div
                                            key={asset.id}
                                            onClick={() => onSelectMedia(asset.instagramMediaId)}
                                            style={{
                                                border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border)",
                                                borderRadius: "var(--radius-sm)",
                                                padding: "6px 12px",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "12px",
                                                background: "var(--surface)",
                                                cursor: "pointer",
                                                transition: "all var(--duration) var(--ease)",
                                            }}
                                            className="card-interactive"
                                        >
                                            {/* Left Thumbnail */}
                                            <div style={{ width: 34, height: 34, borderRadius: 4, overflow: "hidden", flexShrink: 0, position: "relative" }}>
                                                {asset.thumbnailUrl || asset.mediaUrl ? (
                                                    <img alt="" src={asset.thumbnailUrl || asset.mediaUrl || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                ) : (
                                                    <div style={{ width: "100%", height: "100%", background: "var(--divider)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                        {isReel ? <Film size={12} /> : <ImageIcon size={12} />}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Title & Caption */}
                                            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                                                <span style={{ fontSize: 12, fontWeight: 550, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {asset.caption || "(No Caption)"}
                                                </span>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: "var(--text-muted)" }}>
                                                    <span>Published {asset.timestamp ? new Date(asset.timestamp).toLocaleDateString() : ""}</span>
                                                    <span>•</span>
                                                    <span style={{ color: "var(--primary)", fontWeight: 650 }}>{asset.assetType}</span>
                                                </div>
                                            </div>

                                            {/* Stat figures */}
                                            <div style={{ display: "flex", gap: "10px", fontSize: 11, color: "var(--text-secondary)", flexShrink: 0 }}>
                                                <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                                                    <ThumbsUp size={10} /> {stats.likes}
                                                </span>
                                                <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                                                    <MessageCircle size={10} /> {stats.comments}
                                                </span>
                                            </div>

                                            {/* Action buttons */}
                                            <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => setPreviewAsset(asset)}
                                                    style={{
                                                        border: "none",
                                                        background: "transparent",
                                                        color: "var(--text-secondary)",
                                                        cursor: "pointer",
                                                    }}
                                                    title="Open Details Drawer"
                                                    type="button"
                                                >
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    )}
                </div>

                {/* ── 3. Detail Preview Drawer Panel ── */}
                {previewAsset && (
                    <div
                        style={{
                            width: "260px",
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-lg)",
                            padding: "var(--space-4)",
                            position: "relative",
                            flexShrink: 0,
                            display: "flex",
                            flexDirection: "column",
                            gap: "var(--space-3)",
                            boxShadow: "var(--shadow-md)",
                        }}
                    >
                        {/* Close trigger */}
                        <button
                            onClick={() => setPreviewAsset(null)}
                            style={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--text-muted)",
                            }}
                            type="button"
                        >
                            <X size={16} />
                        </button>

                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                            Asset Details
                        </span>

                        {/* Media Image Showcase */}
                        <div style={{ width: "100%", height: "130px", borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--divider)", position: "relative" }}>
                            {previewAsset.thumbnailUrl || previewAsset.mediaUrl ? (
                                <img
                                    alt="High resolution cover"
                                    src={previewAsset.thumbnailUrl || previewAsset.mediaUrl || ""}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                            ) : (
                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                                    <ImageIcon size={28} />
                                </div>
                            )}
                        </div>

                        {/* Stats row info */}
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--divider)", paddingBottom: 6, fontSize: 11, color: "var(--text-secondary)" }}>
                                <span>Likes</span>
                                <span style={{ fontWeight: 650, color: "var(--text-primary)" }}>{getSeededStats(previewAsset.instagramMediaId).likes}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--divider)", padding: "6px 0", fontSize: 11, color: "var(--text-secondary)" }}>
                                <span>Comments</span>
                                <span style={{ fontWeight: 650, color: "var(--text-primary)" }}>{getSeededStats(previewAsset.instagramMediaId).comments}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--divider)", padding: "6px 0", fontSize: 11, color: "var(--text-secondary)" }}>
                                <span>Estimated Reach</span>
                                <span style={{ fontWeight: 650, color: "var(--text-primary)" }}>{getSeededStats(previewAsset.instagramMediaId).views}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 11, color: "var(--text-secondary)" }}>
                                <span>Published</span>
                                <span>{previewAsset.timestamp ? new Date(previewAsset.timestamp).toLocaleDateString() : ""}</span>
                            </div>
                        </div>

                        {/* Collapsed Description Caption */}
                        <div style={{ flex: 1, minHeight: 0 }}>
                            <span style={{ fontSize: 11, fontWeight: 550, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                                Caption Context
                            </span>
                            <div
                                style={{
                                    maxHeight: "80px",
                                    overflowY: "auto",
                                    fontSize: 11,
                                    color: "var(--text-secondary)",
                                    lineHeight: 1.4,
                                    padding: "4px 8px",
                                    background: "var(--surface-secondary)",
                                    borderRadius: "var(--radius-sm)",
                                    border: "1px solid var(--border)",
                                }}
                            >
                                {previewAsset.caption || "(No written caption)"}
                            </div>
                        </div>

                        {/* Actions */}
                        {previewAsset.permalink && (
                            <a
                                href={previewAsset.permalink}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 6,
                                    padding: "6px 12px",
                                    background: "var(--hover-bg)",
                                    color: "var(--primary)",
                                    borderRadius: "var(--radius-sm)",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    textDecoration: "none",
                                }}
                            >
                                <ExternalLink size={12} />
                                Open with Instagram
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
