import React from 'react';
import { MessageSquare, Film, Image, Play, AtSign } from 'lucide-react';
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
    description: 'Triggers on incoming direct messages',
    explanation: 'Listens to direct messages sent to your inbox. You can match all incoming messages or filter by specific keywords.',
    icon: <MessageSquare size={20} strokeWidth={2} />,
  },
  REEL_COMMENT: {
    type: 'REEL_COMMENT',
    title: 'Reel Comment',
    description: 'Triggers on Instagram Reel comments',
    explanation: 'Listens for comment interactions on all Reels or a specific linked Reel. Supports automatic comment reply and keyword filtering.',
    icon: <Film size={20} strokeWidth={2} />,
  },
  POST_COMMENT: {
    type: 'POST_COMMENT',
    title: 'Post Comment',
    description: 'Triggers on Feed post comments',
    explanation: 'Listens for comment interactions on your standard feed posts. Works on all media items or specific posts.',
    icon: <Image size={20} strokeWidth={2} />,
  },
  STORY_REPLY: {
    type: 'STORY_REPLY',
    title: 'Story Reply',
    description: 'Triggers on active Story replies',
    explanation: 'Listens to private chat replies generated when visitors react to any of your active published Page Stories.',
    icon: <Play size={20} strokeWidth={2} />,
  },
  STORY_MENTION: {
    type: 'STORY_MENTION',
    title: 'Story Mention',
    description: 'Triggers when user mentions you in a Story',
    explanation: 'Triggers your marketing and response pipeline as soon as another Instagram user tags or mentions your handle in their story.',
    icon: <AtSign size={20} strokeWidth={2} />,
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
