import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AutomationRepository } from '../repositories/automation.repository';
import { CreateAutomationSchema } from '../dto/create-automation.dto';
import { UpdateAutomationSchema } from '../dto/update-automation.dto';

@Controller('automations')
export class AutomationController {
  constructor(private readonly automationRepo: AutomationRepository) {}

  @Get()
  async getAutomations(
    @Headers('x-instagram-account-id') instagramAccountId?: string,
    @Headers('x-workspace-id') workspaceId?: string,
    @Query('search') search?: string,
    @Query('enabled') enabledStr?: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const accountId = instagramAccountId || workspaceId || 'default';
    const enabled =
      enabledStr !== undefined ? enabledStr === 'true' : undefined;
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;

    return this.automationRepo.findMany({
      instagramAccountId: accountId,
      enabled,
      search,
      page,
      limit,
    });
  }

  @Get(':id')
  async getAutomationById(@Param('id') id: string) {
    const automation = await this.automationRepo.findUnique(id);
    if (!automation) {
      throw new NotFoundException(`Automation with ID ${id} not found`);
    }
    return automation;
  }

  @Post()
  async createAutomation(
    @Body() body: any,
    @Headers('x-instagram-account-id') instagramAccountId?: string,
    @Headers('x-workspace-id') workspaceId?: string,
  ) {
    const result = CreateAutomationSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.error.format(),
      });
    }

    const accountId = instagramAccountId || workspaceId || 'default';

    return this.automationRepo.create({
      instagramAccountId: accountId,
      ...result.data,
    });
  }

  @Patch(':id')
  async updateAutomation(@Param('id') id: string, @Body() body: any) {
    const existing = await this.automationRepo.findUnique(id);
    if (!existing) {
      throw new NotFoundException(`Automation with ID ${id} not found`);
    }

    const result = UpdateAutomationSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.error.format(),
      });
    }

    return this.automationRepo.update(id, result.data);
  }

  @Delete(':id')
  async deleteAutomation(@Param('id') id: string) {
    const existing = await this.automationRepo.findUnique(id);
    if (!existing) {
      throw new NotFoundException(`Automation with ID ${id} not found`);
    }

    await this.automationRepo.delete(id);
    return { success: true };
  }

  @Post(':id/enable')
  async enableAutomation(@Param('id') id: string) {
    const existing = await this.automationRepo.findUnique(id);
    if (!existing) {
      throw new NotFoundException(`Automation with ID ${id} not found`);
    }

    return this.automationRepo.update(id, { enabled: true });
  }

  @Post(':id/disable')
  async disableAutomation(@Param('id') id: string) {
    const existing = await this.automationRepo.findUnique(id);
    if (!existing) {
      throw new NotFoundException(`Automation with ID ${id} not found`);
    }

    return this.automationRepo.update(id, { enabled: false });
  }
}
