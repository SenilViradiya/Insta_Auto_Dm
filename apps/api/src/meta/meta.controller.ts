import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Redirect,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { MetaService } from './meta.service';
import { TokenService } from '../modules/meta-platform/services/token.service';
import { PermissionService } from '../modules/meta-platform/services/permission.service';
import { GraphClient } from '../modules/meta-platform/clients/graph.client';
import { z } from 'zod';

const DisconnectSchema = z.object({
  id: z.string().uuid(),
});

@Controller('meta')
export class MetaController {
  constructor(
    private readonly metaService: MetaService,
    private readonly tokenService: TokenService,
    private readonly permissionService: PermissionService,
    private readonly graphClient: GraphClient,
  ) { }

  @Get('debug-subscriptions')
  async debugSubscriptions() {
    const statusResult = await this.metaService.getStatus();
    const results = [];

    for (const acc of statusResult) {
      try {
        const token = await this.tokenService.getToken(acc.id);

        // Retrieve existing subscriptions
        const existing = await this.graphClient.request({
          method: 'GET',
          endpoint: 'https://graph.instagram.com/me/subscribed_apps',
          token,
        });

        // Try to trigger a fresh/repaired subscription
        const repairResult = await this.graphClient.request({
          method: 'POST',
          endpoint: 'https://graph.instagram.com/me/subscribed_apps',
          params: {
            subscribed_fields: 'comments,messages,messaging_postbacks',
          },
          token,
        });

        results.push({
          accountId: acc.id,
          instagramUserId: acc.instagramUserId,
          username: acc.username,
          existing,
          repairResult,
        });
      } catch (e: any) {
        results.push({
          accountId: acc.id,
          username: acc.username,
          error: e.message || 'Error occurred during debug',
        });
      }
    }

    return results;
  }

  @Get('login')
  @Redirect()
  login() {
    const url = this.metaService.getLoginUrl();
    return { url };
  }

  @Get('callback')
  async callback(
    @Query('code') code?: string,
    @Query('error') error?: string,
    @Res() res?: Response,
  ) {
    const nextUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    if (error || !code) {
      const errMsg = error || 'Authorization code not provided';
      if (res) {
        return res.redirect(`${nextUrl}?error=${encodeURIComponent(errMsg)}`);
      }
      throw new BadRequestException(errMsg);
    }

    try {
      await this.metaService.exchangeCodeAndConnect(code);
      if (res) {
        return res.redirect(`${nextUrl}?connected=true`);
      }
      return { success: true };
    } catch (e) {
      const errMsg =
        e instanceof Error ? e.message : 'Failed to complete Meta integration';
      if (res) {
        return res.redirect(`${nextUrl}?error=${encodeURIComponent(errMsg)}`);
      }
      throw new BadRequestException(errMsg);
    }
  }

  @Get('status')
  async status() {
    const accounts = await this.metaService.getStatus();
    return { accounts };
  }

  @Get('permissions')
  async permissions(@Query('accountId') accountId: string) {
    if (!accountId) {
      throw new BadRequestException('accountId query parameter is required');
    }
    try {
      const token = await this.tokenService.getToken(accountId);
      return await this.permissionService.validatePermissions(token);
    } catch (e: any) {
      throw new BadRequestException(e.message || 'Failed to validate permissions');
    }
  }

  @Post('disconnect')
  async disconnect(@Body() body: any) {
    const parsed = DisconnectSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid request body',
        errors: parsed.error.format(),
      });
    }

    await this.metaService.disconnect(parsed.data.id);
    return { success: true };
  }
}
