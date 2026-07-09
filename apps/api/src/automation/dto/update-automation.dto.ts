import { z } from 'zod';
import { CreateAutomationSchema } from './create-automation.dto';

export const UpdateAutomationSchema = CreateAutomationSchema.partial();

export type UpdateAutomationDto = z.infer<typeof UpdateAutomationSchema>;
