import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ExecutionRepository } from '../repositories/execution.repository';
import { ExecutionStatus } from '@prisma/client';

@Controller('executions')
export class ExecutionController {
  constructor(private readonly executionRepo: ExecutionRepository) {}

  @Get()
  async getExecutions(
    @Query('status') status?: ExecutionStatus,
    @Query('automationId') automationId?: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    const skip = (page - 1) * limit;

    return this.executionRepo.findMany({
      status,
      automationId,
      skip,
      take: limit,
    });
  }

  @Get(':id')
  async getExecutionById(@Param('id') id: string) {
    const execution = await this.executionRepo.findById(id);
    if (!execution) {
      throw new NotFoundException(
        `Automation Execution record not found for ID: ${id}`,
      );
    }
    return execution;
  }

  @Get(':id/logs')
  async getExecutionLogs(@Param('id') id: string) {
    const execution = await this.executionRepo.findById(id);
    if (!execution) {
      throw new NotFoundException(
        `Automation Execution record not found for ID: ${id}`,
      );
    }
    return this.executionRepo.findLogs(id);
  }
}
