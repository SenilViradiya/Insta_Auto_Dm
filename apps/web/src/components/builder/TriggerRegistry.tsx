import React from 'react';
import {
  MessageOutlined,
  VideoCameraOutlined,
  PictureOutlined,
  PlayCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { TriggerType } from './types';

import DirectMessageTriggerConfig from './trigger-configs/DirectMessageTriggerConfig';
import ReelCommentTriggerConfig from './trigger-configs/ReelCommentTriggerConfig';
import PostCommentTriggerConfig from './trigger-configs/PostCommentTriggerConfig';
import StoryReplyTriggerConfig from './trigger-configs/StoryReplyTriggerConfig';
import StoryMentionTriggerConfig from './trigger-configs/StoryMentionTriggerConfig';

export interface TriggerMetadata {
  type: TriggerType;
  title: string;
  description: string;
  explanation: string;
  icon: React.ReactNode;
}

export const TRIGGER_REGISTRY: Record<TriggerType, TriggerMetadata> = {
  DIRECT_MESSAGE: {
    type: 'DIRECT_MESSAGE',
    title: 'Direct Message',
    description: 'Triggers on incoming DMs',
    explanation: 'Listens to direct messages sent to your inbox. You can match any message or look for specific keywords.',
    icon: <MessageOutlined style={{ fontSize: '24px', color: '#3b82f6' }} />,
  },
  REEL_COMMENT: {
    type: 'REEL_COMMENT',
    title: 'Reel Comment',
    description: 'Triggers on Reel comments',
    explanation: 'Listens for comments left on all Reels or a specific Reel asset. Supports custom reply comments & trigger keywords.',
    icon: <VideoCameraOutlined style={{ fontSize: '24px', color: '#ec4899' }} />,
  },
  POST_COMMENT: {
    type: 'POST_COMMENT',
    title: 'Post Comment',
    description: 'Triggers on Feed post comments',
    explanation: 'Listens for comments left on your standard feed media. Trigger automations when visitors leave feedback on specific posts.',
    icon: <PictureOutlined style={{ fontSize: '24px', color: '#10b981' }} />,
  },
  STORY_REPLY: {
    type: 'STORY_REPLY',
    title: 'Story Reply',
    description: 'Triggers on Story replies',
    explanation: 'Listens to conversations created when users reply to any active story posted by your linked page.',
    icon: <PlayCircleOutlined style={{ fontSize: '24px', color: '#f59e0b' }} />,
  },
  STORY_MENTION: {
    type: 'STORY_MENTION',
    title: 'Story Mention',
    description: 'Triggers when mentioned in a Story',
    explanation: 'Triggers automations immediately as soon as another Instagram account tags you in their story post.',
    icon: <UserOutlined style={{ fontSize: '24px', color: '#8b5cf6' }} />,
  },
};

interface RenderConfigProps {
  type: TriggerType;
  config: any;
  onChange: (config: any) => void;
  instagramAccountId: string;
}

export function RenderTriggerConfig({
  type,
  config,
  onChange,
  instagramAccountId,
}: RenderConfigProps) {
  switch (type) {
    case 'DIRECT_MESSAGE':
      return <DirectMessageTriggerConfig config={config} onChange={onChange} />;
    case 'REEL_COMMENT':
      return (
        <ReelCommentTriggerConfig
          config={config}
          onChange={onChange}
          instagramAccountId={instagramAccountId}
        />
      );
    case 'POST_COMMENT':
      return (
        <PostCommentTriggerConfig
          config={config}
          onChange={onChange}
          instagramAccountId={instagramAccountId}
        />
      );
    case 'STORY_REPLY':
      return <StoryReplyTriggerConfig config={config} onChange={onChange} />;
    case 'STORY_MENTION':
      return <StoryMentionTriggerConfig config={config} onChange={onChange} />;
    default:
      return null;
  }
}
