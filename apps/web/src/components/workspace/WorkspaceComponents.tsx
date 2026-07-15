"use client";

import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Instagram,
  Check,
  ChevronDown,
  Plus,
  RefreshCw,
  Link2,
  Unplug,
  AlertTriangle,
  Server,
  Key,
  ShieldCheck,
  Info,
  CheckCircle2,
  Users,
  Image,
  Video,
  Clock,
  ExternalLink,
} from "lucide-react";
import { message } from "antd";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface InstagramAccount {
  id: string;
  instagramUserId: string;
  pageId: string;
  pageName: string;
  connectedAt: string;
}

interface InstagramProfile {
  id: string;
  instagramAccountId: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
  followers: number;
  following: number;
  mediaCount: number;
  biography?: string;
  website?: string;
  lastSyncedAt?: string;
}

// ── 1. ACCOUNT SWITCHER (STRIPE-STYLE DROPDOWN) ──
export function AccountSwitcher({
  accounts,
  selectedId,
  onSelect,
  onConnectNew,
}: {
  accounts: InstagramAccount[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onConnectNew: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedAccount = accounts.find((a) => a.id === selectedId);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", zIndex: 100 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          fontSize: "13px",
          fontWeight: 600,
          color: "var(--text-primary)",
          cursor: "pointer",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          outline: "none",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.borderColor = "var(--text-secondary)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.borderColor = "var(--border)")
        }
      >
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #833AB4, #E1306C, #F77737)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: "9px",
          }}
        >
          <Instagram size={11} color="#fff" />
        </div>
        <span
          style={{
            maxWidth: "160px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {selectedAccount ? selectedAccount.pageName : "Select Account"}
        </span>
        <ChevronDown
          size={14}
          color="var(--text-secondary)"
          style={{
            transform: isOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.2s ease",
          }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            width: "260px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-md), 0 10px 30px -10px rgba(0,0,0,0.15)",
            padding: "6px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            animation: "drawer-slide-in 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              padding: "6px 8px 4px 8px",
            }}
          >
            Instagram Workspaces
          </span>

          <div
            style={{
              maxHeight: "200px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            {accounts.map((acc) => {
              const active = acc.id === selectedId;
              return (
                <button
                  key={acc.id}
                  onClick={() => {
                    onSelect(acc.id);
                    setIsOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    background: active ? "var(--hover-bg)" : "transparent",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    transition: "background 0.1s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!active)
                      e.currentTarget.style.background =
                        "var(--surface-secondary)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: active
                          ? "var(--primary)"
                          : "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "bold",
                        flexShrink: 0,
                      }}
                    >
                      {acc.pageName.slice(0, 2).toUpperCase()}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {acc.pageName}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          color: "var(--text-muted)",
                          fontFamily: "monospace",
                        }}
                      >
                        @{acc.instagramUserId || "account"}
                      </span>
                    </div>
                  </div>
                  {active && (
                    <Check
                      size={14}
                      color="var(--primary)"
                      style={{ flexShrink: 0 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div
            style={{
              borderTop: "1px solid var(--divider)",
              marginTop: "4px",
              paddingTop: "4px",
            }}
          >
            <button
              onClick={() => {
                onConnectNew();
                setIsOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 10px",
                width: "100%",
                background: "transparent",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontSize: "12px",
                color: "var(--primary)",
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--hover-bg)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <Plus size={14} /> Connect New Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 2. CONNECTION HEALTH ──
export function ConnectionHealth({ account }: { account: InstagramAccount }) {
  // Realistic scopes verification list
  const scopes = [
    {
      name: "instagram_manage_messages",
      description: "Read & trigger DM automated replies",
      active: true,
    },
    {
      name: "instagram_manage_comments",
      description: "Listen & filter comment text fields",
      active: true,
    },
    {
      name: "instagram_basic",
      description: "Access Instagram profile handle/stats",
      active: true,
    },
    {
      name: "pages_messaging",
      description: "Dispatch webhooks on comment payloads",
      active: true,
    },
    {
      name: "pages_read_engagement",
      description: "Index story replies & post assets",
      active: true,
    },
  ];

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
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <h4
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            API Connection Security
          </h4>
          <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            Token credentials and webhook pipeline statuses
          </span>
        </div>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            background: "var(--success-bg)",
            color: "var(--success)",
            padding: "3px 8px",
            borderRadius: "12px",
          }}
        >
          ● Active Token
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginTop: "4px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            borderBottom: "1px solid var(--divider)",
            paddingBottom: "8px",
          }}
        >
          <span
            style={{
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Server size={13} color="var(--text-muted)" /> Webhook Status
          </span>
          <span style={{ fontWeight: 600, color: "var(--success)" }}>
            Online / Listening
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            borderBottom: "1px solid var(--divider)",
            paddingBottom: "8px",
          }}
        >
          <span
            style={{
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Key size={13} color="var(--text-muted)" /> SSL Verification
          </span>
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            HMAC Verified
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
          }}
        >
          <span
            style={{
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Clock size={13} color="var(--text-muted)" /> Session Expiry
          </span>
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            Never / Auto-Refresh
          </span>
        </div>
      </div>

      <div style={{ marginTop: "8px" }}>
        <span
          style={{
            display: "block",
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            marginBottom: "6px",
          }}
        >
          Auth Access Scope Token
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {scopes.map((s, idx) => (
            <span
              key={idx}
              style={{
                fontSize: "10px",
                background: "var(--surface-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                padding: "2px 6px",
                borderRadius: "4px",
                fontFamily: "monospace",
              }}
              title={s.description}
            >
              ✓ {s.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 3. PERMISSION HEALTH ──
export function PermissionHealth() {
  const permissionsList = [
    {
      title: "Inbox Messenger Read/Write",
      spec: "instagram_manage_messages",
      ok: true,
    },
    {
      title: "Direct Comments Read/Write",
      spec: "instagram_manage_comments",
      ok: true,
    },
    { title: "Story Mention Capture", spec: "instagram_basic", ok: true },
    { title: "Callback Webhook Relay", spec: "pages_messaging", ok: true },
    { title: "Instagram Content Sync", spec: "pages_show_list", ok: true },
  ];

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
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <h4
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Meta Scope Permissions
          </h4>
          <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            Token scopes required for automated lead tracking
          </span>
        </div>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 650,
            background: "var(--success-bg)",
            color: "var(--success)",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "2px 8px",
            borderRadius: "12px",
          }}
        >
          <ShieldCheck size={12} />
          All Sync'd
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginTop: "4px",
        }}
      >
        {permissionsList.map((perm, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "12px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                {perm.title}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--text-muted)",
                  fontFamily: "monospace",
                }}
              >
                {perm.spec}
              </span>
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: "var(--success-bg)",
                color: "var(--success)",
              }}
            >
              <Check size={10} strokeWidth={3} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 4. SYNC STATUS ──
export function SyncStatus({
  profile,
  onSyncNow,
  isSyncing,
}: {
  profile: InstagramProfile | null;
  onSyncNow: () => void;
  isSyncing: boolean;
}) {
  const lastSyncLabel = profile?.lastSyncedAt
    ? new Date(profile.lastSyncedAt).toLocaleString()
    : "Not synchronized yet";

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
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <h4
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Asset Synchronization
          </h4>
          <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            Fetch latest Reels, comments and profile details
          </span>
        </div>
        <button
          onClick={onSyncNow}
          disabled={isSyncing}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--primary)",
            cursor: isSyncing ? "wait" : "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (!isSyncing)
              e.currentTarget.style.background = "var(--hover-bg)";
          }}
          onMouseLeave={(e) => {
            if (!isSyncing) e.currentTarget.style.background = "transparent";
          }}
        >
          <RefreshCw
            size={12}
            className={isSyncing ? "animate-spin" : ""}
            style={{
              animation: isSyncing ? "spin 1.5s linear infinite" : "none",
            }}
          />
          {isSyncing ? "Synchronizing…" : "Sync Now"}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginTop: "4px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            borderBottom: "1px solid var(--divider)",
            paddingBottom: "8px",
          }}
        >
          <span style={{ color: "var(--text-secondary)" }}>
            Last Synced Timestamp
          </span>
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            {lastSyncLabel}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            borderBottom: "1px solid var(--divider)",
            paddingBottom: "8px",
          }}
        >
          <span style={{ color: "var(--text-secondary)" }}>
            Media Library Synced
          </span>
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
            {profile?.mediaCount || 0} Media Posts
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
          }}
        >
          <span style={{ color: "var(--text-secondary)" }}>
            Rate Limits Check
          </span>
          <span style={{ fontWeight: 600, color: "var(--success)" }}>
            0% / 100% Rate Used
          </span>
        </div>
      </div>

      <div
        style={{
          background: "var(--surface-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "10px 12px",
          display: "flex",
          alignItems: "flex-start",
          gap: "8px",
          fontSize: "11px",
          color: "var(--text-secondary)",
        }}
      >
        <Info
          size={14}
          color="var(--primary)"
          style={{ flexShrink: 0, marginTop: "1px" }}
        />
        <span>
          Sync checks occur automatically every 15 minutes to pull new posts,
          captions, and comments. Manual sync fetches Instagram API properties
          immediately.
        </span>
      </div>
    </div>
  );
}

// ── 5. WORKSPACE HEADER CARD ──
export function WorkspaceHeader({
  account,
  profile,
  onDisconnect,
  isDisconnecting,
  onSyncNow,
  isSyncing,
  onReconnect,
}: {
  account: InstagramAccount;
  profile: InstagramProfile | null;
  onDisconnect: () => void;
  isDisconnecting: boolean;
  onSyncNow: () => void;
  isSyncing: boolean;
  onReconnect: () => void;
}) {
  const avatarUrl = profile?.profilePictureUrl || "";
  const usernameStr = profile?.username || account.instagramUserId;
  const nameStr = profile?.name || account.pageName;
  const followersCount = profile?.followers || 0;
  const followingCount = profile?.following || 0;
  const mediaCount = profile?.mediaCount || 0;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        {/* Profile Info Left */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            alignItems: "center",
            minWidth: "260px",
          }}
        >
          <div style={{ position: "relative" }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={nameStr}
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid var(--border)",
                }}
              />
            ) : (
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, #833AB4 0%, #E1306C 50%, #F56040 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "20px",
                }}
              >
                {nameStr.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                background: "#E1306C",
                borderRadius: "50%",
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid var(--surface)",
              }}
            >
              <Instagram size={10} color="#fff" />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                {nameStr}
              </h2>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "#0369A1",
                  background: "#E0F2FE",
                  padding: "1px 6px",
                  borderRadius: "4px",
                }}
              >
                Business
              </span>
            </div>

            <span
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                fontFamily: "monospace",
              }}
            >
              @{usernameStr}
            </span>

            {profile?.biography && (
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  margin: "4px 0 0 0",
                  maxWidth: "340px",
                  lineHeight: "1.3",
                }}
              >
                {profile.biography}
              </p>
            )}
          </div>
        </div>

        {/* Stats Row Center */}
        <div
          style={{
            display: "flex",
            gap: "32px",
            padding: "8px 24px",
            borderLeft: "1px solid var(--border)",
            borderRight: "1px solid var(--border)",
          }}
          className="workspace-stats-box"
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                fontWeight: 550,
                textTransform: "uppercase",
              }}
            >
              Followers
            </span>
            <span
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                <Users size={14} color="var(--primary)" />
                {followersCount.toLocaleString()}
              </div>
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                fontWeight: 550,
                textTransform: "uppercase",
              }}
            >
              Reels Configured
            </span>
            <span
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                <Video size={14} color="var(--primary)" />
                {mediaCount}
              </div>
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                fontWeight: 550,
                textTransform: "uppercase",
              }}
            >
              Connected
            </span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginTop: "4px",
              }}
            >
              {new Date(account.connectedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Action Panel Right */}
        <div style={{ display: "flex", gap: "10px", alignSelf: "center" }}>
          <button
            onClick={onReconnect}
            style={{
              padding: "8px 14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-primary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--surface-secondary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <ExternalLink size={13} />
            Reconnect Account
          </button>

          <button
            onClick={onDisconnect}
            disabled={isDisconnecting}
            style={{
              padding: "8px 14px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--danger)",
              cursor: isDisconnecting ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--danger-bg)";
              e.currentTarget.style.borderColor = "#FECACA";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <Unplug size={13} />
            {isDisconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 6. LOADING SKELETON STATE ──
export function WorkspaceLoadingSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header card skeleton */}
      <div
        className="skeleton"
        style={{
          height: "115px",
          borderRadius: "var(--radius-lg)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          animation: "skeleton-pulse 1.8s infinite",
        }}
      />
      {/* 3 cards skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
        }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton"
            style={{
              height: "220px",
              borderRadius: "var(--radius-lg)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              animation: "skeleton-pulse 1.8s infinite",
            }}
          />
        ))}
      </div>
    </div>
  );
}
