import { z } from 'zod';
import { TriggerType } from '@prisma/client';

export interface TriggerValidator {
  validate(config: any): any;
}

const registry = new Map<string, TriggerValidator>();

export function registerTriggerValidator(type: string, validator: TriggerValidator) {
  registry.set(type, validator);
}

export function validateTriggerConfig(type: string, config: any): any {
  const validator = registry.get(type);
  if (!validator) {
    throw new Error(`No validator registered for trigger type: ${type}`);
  }
  return validator.validate(config);
}

// 1. DIRECT_MESSAGE Validator
export const DirectMessageTriggerSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('ANY_MESSAGE'),
  }),
  z.object({
    mode: z.literal('KEYWORD'),
    keywords: z.array(z.string().min(1)).min(1, 'At least one keyword is required'),
  }),
]);

class DirectMessageValidator implements TriggerValidator {
  validate(config: any) {
    return DirectMessageTriggerSchema.parse(config);
  }
}

// 2. REEL_COMMENT Validator
export const ReelCommentTriggerSchema = z.object({
  mediaScope: z.enum(['ALL_REELS', 'SPECIFIC_REEL']),
  mediaId: z.string().optional(),
  matchType: z.enum(['ANY_COMMENT', 'KEYWORD']).optional().default('ANY_COMMENT'),
  keywords: z.array(z.string().min(1)).optional(),
  publicReply: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.mediaScope === 'SPECIFIC_REEL' && !data.mediaId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'mediaId is required for SPECIFIC_REEL mediaScope',
      path: ['mediaId'],
    });
  }
  if (data.matchType === 'KEYWORD' && (!data.keywords || data.keywords.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'keywords are required for KEYWORD matchType',
      path: ['keywords'],
    });
  }
});

class ReelCommentValidator implements TriggerValidator {
  validate(config: any) {
    return ReelCommentTriggerSchema.parse(config);
  }
}

// 3. POST_COMMENT Validator
export const PostCommentTriggerSchema = z.object({
  mediaScope: z.enum(['ALL_POSTS', 'SPECIFIC_POST']),
  mediaId: z.string().optional(),
  matchType: z.enum(['ANY_COMMENT', 'KEYWORD']).optional().default('ANY_COMMENT'),
  keywords: z.array(z.string().min(1)).optional(),
  publicReply: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.mediaScope === 'SPECIFIC_POST' && !data.mediaId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'mediaId is required for SPECIFIC_POST mediaScope',
      path: ['mediaId'],
    });
  }
  if (data.matchType === 'KEYWORD' && (!data.keywords || data.keywords.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'keywords are required for KEYWORD matchType',
      path: ['keywords'],
    });
  }
});

class PostCommentValidator implements TriggerValidator {
  validate(config: any) {
    return PostCommentTriggerSchema.parse(config);
  }
}

// 4. STORY_REPLY Validator
export const StoryReplyTriggerSchema = z.object({
  storyScope: z.enum(['ANY']).default('ANY'),
});

class StoryReplyValidator implements TriggerValidator {
  validate(config: any) {
    return StoryReplyTriggerSchema.parse(config);
  }
}

// 5. STORY_MENTION Validator
export const StoryMentionTriggerSchema = z.object({});

class StoryMentionValidator implements TriggerValidator {
  validate(config: any) {
    return StoryMentionTriggerSchema.parse(config || {});
  }
}

// Register initial validators
registerTriggerValidator(TriggerType.DIRECT_MESSAGE, new DirectMessageValidator());
registerTriggerValidator(TriggerType.REEL_COMMENT, new ReelCommentValidator());
registerTriggerValidator(TriggerType.POST_COMMENT, new PostCommentValidator());
registerTriggerValidator(TriggerType.STORY_REPLY, new StoryReplyValidator());
registerTriggerValidator(TriggerType.STORY_MENTION, new StoryMentionValidator());
