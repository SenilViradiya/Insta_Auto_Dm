import { z } from 'zod';
import { TriggerType, Operator, ActionType } from '@prisma/client';
import { validateTriggerConfig } from './trigger-validators';

export const CreateAutomationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  workspaceId: z.string().optional(),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  triggerType: z.nativeEnum(TriggerType),
  triggerConfig: z.any().default({}),
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
}).superRefine((data, ctx) => {
  try {
    validateTriggerConfig(data.triggerType, data.triggerConfig);
  } catch (error: any) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid trigger configuration: ${error.message || error}`,
      path: ['triggerConfig'],
    });
  }
});

export type CreateAutomationDto = z.infer<typeof CreateAutomationSchema>;
