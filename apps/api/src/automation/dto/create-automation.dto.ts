import { z } from 'zod';
import { TriggerType, Operator, ActionType } from '@prisma/client';

export const CreateAutomationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  triggerType: z.nativeEnum(TriggerType).optional(),
  triggers: z
    .array(
      z.object({
        eventType: z.nativeEnum(TriggerType),
        enabled: z.boolean().default(true),
      }),
    )
    .min(1, 'At least one trigger is required'),
  conditions: z
    .array(
      z.object({
        field: z.string().min(1, 'Condition field path is required'),
        operator: z.nativeEnum(Operator),
        value: z.string(),
      }),
    )
    .default([]),
  actions: z
    .array(
      z.object({
        actionType: z.nativeEnum(ActionType),
        payload: z.record(z.any()),
      }),
    )
    .min(1, 'At least one action is required'),
});

export type CreateAutomationDto = z.infer<typeof CreateAutomationSchema>;
