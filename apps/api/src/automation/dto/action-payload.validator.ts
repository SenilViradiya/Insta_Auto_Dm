import { z } from 'zod';
import { ActionType } from '@prisma/client';

export const ActionPayloadSchema = z.object({
  version: z.number().int().min(1),
  type: z.nativeEnum(ActionType),
  data: z.record(z.any()),
});

export type ActionPayloadDto = z.infer<typeof ActionPayloadSchema>;

export function normalizePayload(
  actionType: ActionType,
  rawPayload: any,
): ActionPayloadDto {
  if (rawPayload && typeof rawPayload === 'object' && 'version' in rawPayload) {
    const result = ActionPayloadSchema.safeParse(rawPayload);
    if (!result.success) {
      throw new Error(
        `Invalid action payload structure: ${JSON.stringify(
          result.error.format(),
        )}`,
      );
    }
    return result.data;
  }

  // Normalize old flat structure for backward compatibility
  return {
    version: 1,
    type: actionType,
    data: rawPayload || {},
  };
}
