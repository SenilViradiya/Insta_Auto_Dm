import React, { useState } from 'react';
import { Radio, Input, Button, Tag, Spin } from 'antd';
import { Plus, Image, ExternalLink, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const { TextArea } = Input;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface PostCommentTriggerConfigProps {
  config: any;
  onChange: (config: any) => void;
  instagramAccountId: string;
}

export default function PostCommentTriggerConfig({
  config,
  onChange,
  instagramAccountId,
}: PostCommentTriggerConfigProps) {
  const mediaScope = config?.mediaScope || 'ALL_POSTS';
  const mediaId = config?.mediaId || '';
  const matchType = config?.matchType || 'ANY_COMMENT';
  const keywords: string[] = config?.keywords || [];
  const publicReply = config?.publicReply || '';

  const [inputVal, setInputVal] = useState('');

  // Fetch posts from Assets API
  const { data: postsData, isLoading, error } = useQuery({
    queryKey: ['assets-posts', instagramAccountId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/assets/posts`, {
        headers: {
          'x-instagram-account-id': instagramAccountId,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to load posts assets');
      }
      return response.json() as Promise<{ items: any[] }>;
    },
    enabled: !!instagramAccountId && instagramAccountId !== 'default',
  });

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
      setInputVal('');
    }
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    handleUpdate({ keywords: keywords.filter((kw) => kw !== kwToRemove) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* ── 1. Target Scope Selection ── */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
          Post Targeting Scope
        </label>
        <Radio.Group
          value={mediaScope}
          onChange={(e) => handleUpdate({ mediaScope: e.target.value, mediaId: e.target.value === 'ALL_POSTS' ? '' : mediaId })}
          size="middle"
        >
          <Radio.Button value="ALL_POSTS">All Posts</Radio.Button>
          <Radio.Button value="SPECIFIC_POST">Specific Post</Radio.Button>
        </Radio.Group>
      </div>

      {/* ── 2. Specific Asset Selector ── */}
      {mediaScope === 'SPECIFIC_POST' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
            Select Target Post
          </label>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6)' }}>
              <Spin size="small" />
            </div>
          ) : error ? (
            <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: 12, borderRadius: 'var(--radius-md)' }}>
              Failed to load feed posts.
            </div>
          ) : (postsData?.items || []).length === 0 ? (
            <div style={{ padding: 'var(--space-4)', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No posts synchronized. Check Facebook/Meta connection.</span>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                gap: 'var(--space-3)',
                maxHeight: '260px',
                overflowY: 'auto',
                padding: 'var(--space-1) 0',
              }}
            >
              {(postsData?.items || []).map((post: any) => {
                const isSelected = mediaId === post.instagramMediaId;
                return (
                  <div
                    key={post.id}
                    onClick={() => handleUpdate({ mediaId: post.instagramMediaId })}
                    style={{
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      background: 'var(--surface)',
                      transition: 'all var(--duration) var(--ease)',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                    }}
                    className="card-interactive"
                  >
                    {/* Thumbnail Cover */}
                    {post.thumbnailUrl || post.mediaUrl ? (
                      <img
                        alt="Post thumbnail"
                        src={post.thumbnailUrl || post.mediaUrl}
                        style={{ height: '90px', width: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ height: '90px', background: 'var(--divider)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <Image size={20} />
                      </div>
                    )}

                    {/* Meta Overlay Check */}
                    {isSelected && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          background: 'var(--primary)',
                          color: '#fff',
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}

                    {/* Info */}
                    <div style={{ padding: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {post.caption || '(No Caption)'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {post.timestamp ? new Date(post.timestamp).toLocaleDateString() : ''}
                        </span>
                        {post.permalink && (
                          <a
                            href={post.permalink}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {mediaScope === 'SPECIFIC_POST' && !mediaId && (
            <span style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 500 }}>
              * Select a specific feed post to apply automation rules.
            </span>
          )}
        </div>
      )}

      {/* ── 3. Comment Filters ── */}
      <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 'var(--space-4)' }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
          Comment Matching Scope
        </label>
        <Radio.Group
          value={matchType}
          onChange={(e) => handleUpdate({ matchType: e.target.value })}
          size="middle"
        >
          <Radio.Button value="ANY_COMMENT">Any Comment</Radio.Button>
          <Radio.Button value="KEYWORD">Keyword Match</Radio.Button>
        </Radio.Group>
      </div>

      {/* Keywords Setup */}
      {matchType === 'KEYWORD' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Trigger only when incoming comments contain any of the following keyword tags:
          </span>
          <div style={{ display: 'flex', gap: 'var(--space-2)', maxWidth: 360 }}>
            <Input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="e.g. details, price, promo"
              onPressEnter={handleAddKeyword}
            />
            <Button
              type="dashed"
              icon={<Plus size={14} style={{ marginTop: 2 }} />}
              onClick={handleAddKeyword}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              Add
            </Button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', marginTop: 'var(--space-2)' }}>
            {keywords.map((kw) => (
              <Tag
                key={kw}
                closable
                onClose={() => handleRemoveKeyword(kw)}
                color="blue"
                style={{
                  fontSize: 12,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {kw}
              </Tag>
            ))}
            {keywords.length === 0 && (
              <span style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 550 }}>
                Please specify at least one comment keyword trigger filter.
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── 4. Public Comment Reply ── */}
      <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 'var(--space-4)' }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
          Public Comment Auto-Reply <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Optional)</span>
        </label>
        <TextArea
          value={publicReply}
          onChange={(e) => handleUpdate({ publicReply: e.target.value })}
          placeholder="e.g. Sent you a DM with details!"
          rows={2}
          style={{ borderRadius: 'var(--radius-md)' }}
        />
        <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
          If set, this response will be posted as a public comment reply on the user's thread when the workflow is triggered.
        </span>
      </div>
    </div>
  );
}
