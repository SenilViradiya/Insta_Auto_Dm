"use client";

import React, { useState } from "react";
import { Radio, Input, Button, Tag } from "antd";
import { Plus } from "lucide-react";
import AssetLibrary from "../../assets/AssetLibrary";

const { TextArea } = Input;

interface ReelCommentTriggerConfigProps {
  config: any;
  onChange: (config: any) => void;
  instagramAccountId: string;
}

export default function ReelCommentTriggerConfig({
  config,
  onChange,
  instagramAccountId,
}: ReelCommentTriggerConfigProps) {
  const mediaScope = config?.mediaScope || "ALL_REELS";
  const mediaId = config?.mediaId || "";
  const matchType = config?.matchType || "ANY_COMMENT";
  const keywords: string[] = config?.keywords || [];
  const publicReply = config?.publicReply || "";

  const [inputVal, setInputVal] = useState("");

  const handleUpdate = (updates: Partial<any>) => {
    onChange({
      mediaScope,
      mediaId,
      matchType,
      keywords,
      publicReply,
      ...updates,
    });
  };

  const handleAddKeyword = () => {
    const trimmed = inputVal.trim();
    if (trimmed) {
      const alreadyExists = keywords.some(
        (kw) => kw.toLowerCase() === trimmed.toLowerCase()
      );
      if (!alreadyExists) {
        handleUpdate({ keywords: [...keywords, trimmed] });
      }
      setInputVal("");
    }
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    handleUpdate({ keywords: keywords.filter((kw) => kw !== kwToRemove) });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* ── 1. Target Scope Selection ── */}
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: "var(--space-2)" }}>
          Reel Targeting Scope
        </label>
        <Radio.Group
          value={mediaScope}
          onChange={(e: any) => handleUpdate({ mediaScope: e.target.value, mediaId: e.target.value === "ALL_REELS" ? "" : mediaId })}
          size="middle"
        >
          <Radio.Button value="ALL_REELS">All Reels</Radio.Button>
          <Radio.Button value="SPECIFIC_REEL">Specific Reel</Radio.Button>
        </Radio.Group>
      </div>

      {/* ── 2. Specific Asset Selector (Creator Studio Style) ── */}
      {mediaScope === "SPECIFIC_REEL" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <label style={{ fontSize: 13, fontWeight: 650, color: "var(--text-secondary)", marginBottom: "4px" }}>
            Select Target Reel
          </label>
          <AssetLibrary
            instagramAccountId={instagramAccountId}
            selectedMediaId={mediaId}
            onSelectMedia={(id) => handleUpdate({ mediaId: id })}
            allowedAssetType="REEL"
          />
          {mediaScope === "SPECIFIC_REEL" && !mediaId && (
            <span style={{ fontSize: 11, color: "var(--warning)", fontWeight: 500, marginTop: "4px" }}>
              * Select a specific reel from the library to apply automation rules.
            </span>
          )}
        </div>
      )}

      {/* ── 3. Comment Filters ── */}
      <div style={{ borderTop: "1px solid var(--divider)", paddingTop: "var(--space-4)" }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: "var(--space-2)" }}>
          Comment Matching Scope
        </label>
        <Radio.Group
          value={matchType}
          onChange={(e: any) => handleUpdate({ matchType: e.target.value })}
          size="middle"
        >
          <Radio.Button value="ANY_COMMENT">Any Comment</Radio.Button>
          <Radio.Button value="KEYWORD">Keyword Match</Radio.Button>
        </Radio.Group>
      </div>

      {/* Keywords Setup */}
      {matchType === "KEYWORD" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Trigger only when incoming comments contain any of the following keyword tags:
          </span>
          <div style={{ display: "flex", gap: "var(--space-2)", maxWidth: 360 }}>
            <Input
              value={inputVal}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputVal(e.target.value)}
              placeholder="e.g. details, price, promo"
              onPressEnter={handleAddKeyword}
            />
            <Button
              type="dashed"
              icon={<Plus size={14} style={{ marginTop: 2 }} />}
              onClick={handleAddKeyword}
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              Add
            </Button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)", marginTop: "var(--space-2)" }}>
            {keywords.map((kw) => (
              <Tag
                key={kw}
                closable
                onClose={() => handleRemoveKeyword(kw)}
                color="blue"
                style={{
                  fontSize: 12,
                  padding: "2px 8px",
                  borderRadius: "var(--radius-sm)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {kw}
              </Tag>
            ))}
            {keywords.length === 0 && (
              <span style={{ fontSize: 11, color: "var(--warning)", fontWeight: 550 }}>
                Please specify at least one comment keyword trigger filter.
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── 4. Public Comment Reply ── */}
      <div style={{ borderTop: "1px solid var(--divider)", paddingTop: "var(--space-4)" }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: "var(--space-2)" }}>
          Public Comment Auto-Reply <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(Optional)</span>
        </label>
        <TextArea
          value={publicReply}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleUpdate({ publicReply: e.target.value })}
          placeholder="e.g. Check your direct messages! Sent you the discount link!"
          rows={2}
          style={{ borderRadius: "var(--radius-md)" }}
        />
        <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
          If set, this response will be posted as a public comment reply on the user's thread when the workflow is triggered.
        </span>
      </div>
    </div>
  );
}
