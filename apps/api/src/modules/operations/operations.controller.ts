import { Controller, Get } from '@nestjs/common';
import { OperationsService } from './operations.service';
import { SystemHealthResponseDto } from './dto/system-health.dto';
import { AccountHealthResponseDto } from './dto/account-health.dto';

@Controller('operations')
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get('system')
  async getSystemHealth(): Promise<SystemHealthResponseDto> {
    return this.operationsService.getSystemHealth();
  }

  @Get('accounts')
  async getAccountsHealth(): Promise<AccountHealthResponseDto[]> {
    return this.operationsService.getAccountsHealth();
  }

  @Get('events')
  async getRecentEvents(): Promise<any[]> {
    return this.operationsService.getRecentEvents();
  }

  @Get('errors')
  async getLatestErrors(): Promise<any[]> {
    return this.operationsService.getLatestErrors();
  }
}
