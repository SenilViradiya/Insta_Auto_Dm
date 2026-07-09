import { z } from 'zod';

export const SendMessageApiSchema = z.object({
  instagramAccountId: z.string().min(1, 'instagramAccountId is required'),
  recipientInstagramId: z.string().min(1, 'recipientInstagramId is required'),
  messageText: z.string().min(1).max(1000),
  messageType: z.string().optional().default('TEXT'),
});

export type SendMessageApiDto = z.infer<typeof SendMessageApiSchema>;
