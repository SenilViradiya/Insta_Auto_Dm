import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { AutomationService } from './automation.service';
import { z } from 'zod';

const MatchTypeSchema = z.enum(['EXACT', 'CONTAINS', 'STARTS_WITH']);

const CreateAutomationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  enabled: z.boolean().optional(),
  keywords: z
    .array(
      z.object({
        keyword: z.string().min(1, 'Keyword cannot be empty'),
        matchType: MatchTypeSchema,
      }),
    )
    .min(1, 'At least one keyword is required'),
  actions: z
    .array(
      z.object({
        message: z.string().min(1, 'Message cannot be empty'),
        delaySeconds: z.number().int().nonnegative().optional(),
      }),
    )
    .min(1, 'At least one action is required'),
});

const UpdateAutomationSchema = z.object({
  name: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  keywords: z
    .array(
      z.object({
        keyword: z.string().min(1, 'Keyword cannot be empty'),
        matchType: MatchTypeSchema,
      }),
    )
    .optional(),
  actions: z
    .array(
      z.object({
        message: z.string().min(1, 'Message cannot be empty'),
        delaySeconds: z.number().int().nonnegative().optional(),
      }),
    )
    .optional(),
});

@Controller('automations')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Post()
  async create(@Body() body: any) {
    const result = CreateAutomationSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Invalid payload parameters',
        errors: result.error.format(),
      });
    }
    return this.automationService.create(result.data);
  }

  @Get()
  async findAll() {
    return this.automationService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // Validate uuid pattern
    if (!z.string().uuid().safeParse(id).success) {
      throw new BadRequestException('Invalid UUID format');
    }
    return this.automationService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    if (!z.string().uuid().safeParse(id).success) {
      throw new BadRequestException('Invalid UUID format');
    }

    const result = UpdateAutomationSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Invalid payload parameters',
        errors: result.error.format(),
      });
    }

    return this.automationService.update(id, result.data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    if (!z.string().uuid().safeParse(id).success) {
      throw new BadRequestException('Invalid UUID format');
    }
    return this.automationService.remove(id);
  }
}
