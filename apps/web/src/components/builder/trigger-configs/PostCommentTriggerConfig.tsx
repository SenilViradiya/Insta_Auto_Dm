import React, { useState } from 'react';
import { Radio, Input, Button, Tag, Typography, Spin, Card, Row, Col, Alert } from 'antd';
import { PlusOutlined, FileImageOutlined, LinkOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';

const { Text } = Typography;
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
    if (trimmed && !keywords.includes(trimmed)) {
      handleUpdate({ keywords: [...keywords, trimmed] });
      setInputVal('');
    }
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    handleUpdate({ keywords: keywords.filter((kw) => kw !== kwToRemove) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Media Scope Selection */}
      <div>
        <Text strong style={{ display: 'block', marginBottom: '8px' }}>
          Select Posts Scope
        </Text>
        <Radio.Group
          value={mediaScope}
          onChange={(e) => handleUpdate({ mediaScope: e.target.value, mediaId: e.target.value === 'ALL_POSTS' ? '' : mediaId })}
          size="large"
        >
          <Radio.Button value="ALL_POSTS">All Posts</Radio.Button>
          <Radio.Button value="SPECIFIC_POST">Specific Post</Radio.Button>
        </Radio.Group>
      </div>

      {/* 2. Specific Post Selector Grid */}
      {mediaScope === 'SPECIFIC_POST' && (
        <div style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
          <Text strong style={{ fontSize: '13px', display: 'block', marginBottom: '12px' }}>
            Choose a Post
          </Text>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
              <Spin size="default" />
            </div>
          ) : error ? (
            <Alert message="Error fetching posts" type="error" showIcon />
          ) : (postsData?.items || []).length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <Text type="secondary">No posts synced. Try checking assets integration or sync profile.</Text>
            </div>
          ) : (
            <Row gutter={[12, 12]} style={{ maxHeight: '300px', overflowY: 'auto', padding: '4px' }}>
              {(postsData?.items || []).map((post: any) => {
                const isSelected = mediaId === post.instagramMediaId;
                return (
                  <Col xs={12} sm={8} key={post.id}>
                    <Card
                      hoverable
                      cover={
                        post.mediaUrl || post.thumbnailUrl ? (
                          <img
                            alt="Post thumbnail"
                            src={post.thumbnailUrl || post.mediaUrl}
                            style={{ height: '100px', objectFit: 'cover', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}
                          />
                        ) : (
                          <div style={{ height: '100px', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileImageOutlined style={{ fontSize: '24px', color: '#64748b' }} />
                          </div>
                        )
                      }
                      styles={{ body: { padding: '8px' } }}
                      style={{
                        borderRadius: '8px',
                        border: isSelected ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                        background: isSelected ? '#eeebff' : 'white',
                      }}
                      onClick={() => handleUpdate({ mediaId: post.instagramMediaId })}
                    >
                      <Card.Meta
                        title={
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {post.caption || '(No caption)'}
                            </span>
                            {post.permalink && (
                              <a href={post.permalink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                                <LinkOutlined style={{ fontSize: '10px' }} />
                              </a>
                            )}
                          </div>
                        }
                        description={
                          <span style={{ fontSize: '10px' }}>
                            {post.timestamp ? new Date(post.timestamp).toLocaleDateString() : ''}
                          </span>
                        }
                      />
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}

          {mediaScope === 'SPECIFIC_POST' && !mediaId && (
            <Text type="warning" style={{ fontSize: '12px', display: 'block', marginTop: '8px' }}>
              Please select a specific post from the list.
            </Text>
          )}
        </div>
      )}

      {/* 3. Comment Selection */}
      <div>
        <Text strong style={{ display: 'block', marginBottom: '8px' }}>
          Comment Matching Criteria
        </Text>
        <Radio.Group
          value={matchType}
          onChange={(e) => handleUpdate({ matchType: e.target.value })}
          size="middle"
        >
          <Radio.Button value="ANY_COMMENT">Any Comment</Radio.Button>
          <Radio.Button value="KEYWORD">Keyword Match</Radio.Button>
        </Radio.Group>
      </div>

      {/* 4. Keyword inputs */}
      {matchType === 'KEYWORD' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Text type="secondary" style={{ fontSize: '13px' }}>
            Triggers when comment text contains keyword chips:
          </Text>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="e.g. details, price, buy"
              onPressEnter={handleAddKeyword}
              style={{ maxWidth: '280px' }}
            />
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={handleAddKeyword}
            >
              Add
            </Button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {keywords.map((kw) => (
              <Tag
                key={kw}
                closable
                onClose={() => handleRemoveKeyword(kw)}
                color="indigo"
                style={{ fontSize: '13px' }}
              >
                {kw}
              </Tag>
            ))}
            {keywords.length === 0 && (
              <Text type="warning" style={{ fontSize: '12px' }}>
                Please add at least one keyword.
              </Text>
            )}
          </div>
        </div>
      )}

      {/* 5. Public Comment Reply */}
      <div>
        <Text strong style={{ display: 'block', marginBottom: '8px' }}>
          Public Reply Comment (Optional)
        </Text>
        <TextArea
          value={publicReply}
          onChange={(e) => handleUpdate({ publicReply: e.target.value })}
          placeholder="e.g. Sent you a DM with details!"
          rows={2}
        />
        <Text type="secondary" style={{ fontSize: '11px' }}>
          If specified, this text comment will be automatically posted as a reply to the user's comment.
        </Text>
      </div>
    </div>
  );
}
