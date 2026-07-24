"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap,
  Link2,
  Bot,
  Settings,
  Image,
  Activity,
  BarChart3,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AccountSwitcher } from "../workspace/WorkspaceComponents";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface AppShellProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/", label: "Connections", icon: Link2 },
  { href: "/automations", label: "Automations", icon: Bot },
  { href: "/assets", label: "Asset Library", icon: Image },
  { href: "/executions", label: "Execution Logs", icon: Activity },
  { href: "/operations", label: "Control Center", icon: Settings },
];

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const { data: statusData } = useQuery({
    queryKey: ["meta-status"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/meta/status`);
      if (!response.ok) return { accounts: [] };
      return response.json();
    },
  });

  useEffect(() => {
    if (statusData?.accounts && statusData.accounts.length > 0) {
      const saved = localStorage.getItem("selected_instagram_account_id");
      const exactMatch = statusData.accounts.find(
        (acc: any) => acc.id === saved,
      );
      if (saved && exactMatch) {
        setSelectedAccountId(saved);
        return;
      }
      setSelectedAccountId(statusData.accounts[0].id);
    } else {
      setSelectedAccountId(null);
    }
  }, [statusData]);

  const handleSelectAccount = (id: string) => {
    setSelectedAccountId(id);
    localStorage.setItem("selected_instagram_account_id", id);
    window.location.reload();
  };

  const handleConnectNew = () => {
    window.location.href = `${API_URL}/meta/login`;
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* ── Top Navigation Bar ── */}
      <header
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 var(--space-8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 56,
          }}
        >
          {/* Logo & Switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                textDecoration: "none",
              }}
              aria-label="Home"
            >
              <img
                src="/logo.png"
                alt="Flow mint Logo"
                style={{
                  height: 44,
                  width: "auto",
                  borderRadius: "var(--radius-sm)",
                  objectFit: "contain",
                }}
              />
            </Link>

            {statusData?.accounts && statusData.accounts.length > 0 && (
              <>
                <div
                  style={{
                    width: "1px",
                    height: "16px",
                    background: "var(--border)",
                  }}
                />
                <AccountSwitcher
                  accounts={statusData.accounts}
                  selectedId={selectedAccountId}
                  onSelect={handleSelectAccount}
                  onConnectNew={handleConnectNew}
                />
              </>
            )}
          </div>

          {/* Navigation Links */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1)",
            }}
          >
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    padding: "var(--space-2) var(--space-4)",
                    borderRadius: "var(--radius-md)",
                    fontSize: 14,
                    fontWeight: 500,
                    color: active ? "var(--primary)" : "var(--text-secondary)",
                    background: active ? "var(--hover-bg)" : "transparent",
                    textDecoration: "none",
                    transition: "all var(--duration) var(--ease)",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = "var(--text-primary)";
                      e.currentTarget.style.background =
                        "var(--surface-secondary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = "var(--text-secondary)";
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ── Page Content ── */}
      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "var(--space-8)",
        }}
      >
        {children}
      </main>
    </div>
  );
}
