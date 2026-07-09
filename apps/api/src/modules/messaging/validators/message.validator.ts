import { z } from 'zod';
import { MessageValidationException } from '../exceptions/messaging.exceptions';

export const SendMessageSchema = z.object({
  instagramAccountId: z.string().min(1, 'instagramAccountId is required'),
  recipientInstagramId: z.string().min(1, 'recipientInstagramId is required'),
  messageText: z
    .string()
    .min(1, 'Message text cannot be empty')
    .max(1000, 'Message text exceeds maximum length of 1000 characters'),
  messageType: z.string().default('TEXT'),
  automationExecutionId: z.string().optional(),
  correlationId: z.string().optional(),
});

export type ValidatedSendMessage = z.infer<typeof SendMessageSchema>;

export function validateSendMessage(input: unknown): ValidatedSendMessage {
  const result = SendMessageSchema.safeParse(input);
  if (!result.success) {
    const firstError = result.error.issues[0];
    throw new MessageValidationException(
      `Message validation failed: ${firstError.path.join('.')} — ${firstError.message}`,
    );
  }
  return result.data;
}
