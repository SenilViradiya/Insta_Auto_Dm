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
import { z } from 'zod';

const DisconnectSchema = z.object({
  id: z.string().uuid(),
});

@Controller('meta')
export class MetaController {
  constructor(private readonly metaService: MetaService) {}

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
