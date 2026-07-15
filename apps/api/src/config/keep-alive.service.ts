import { Injectable, OnModuleInit, Logger } from '@nestjs/common';

@Injectable()
export class KeepAliveService implements OnModuleInit {
  private readonly logger = new Logger('KeepAliveService');
  private intervalId: NodeJS.Timeout | null = null;

  onModuleInit() {
    this.logger.log('KeepAliveService initialized.');
    this.setupKeepAlive();
  }

  private setupKeepAlive() {
    // Determine the ping target URL
    const targetUrl =
      process.env.API_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      'http://localhost:3001';

    // If we're on localhost and not explicitly forced, we can skip or run it
    const isLocal = targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1');

    if (isLocal && process.env.NODE_ENV !== 'production' && !process.env.FORCE_KEEP_ALIVE) {
      this.logger.log(`Skipping keep-alive ping for local URL: ${targetUrl}. Set FORCE_KEEP_ALIVE=true to force pinging.`);
      return;
    }

    // Ping every 10 minutes (600000 ms) to stay ahead of Render's 15-minute inactivity timeout
    const intervalMs = 10 * 60 * 1000;
    const healthUrl = `${targetUrl.replace(/\/$/, '')}/health`;

    this.logger.log(`Starting self-ping service targeting: ${healthUrl} (interval: 10 minutes)`);

    // Perform initial ping after 30 seconds to let application fully start up
    setTimeout(() => this.ping(healthUrl), 30000);

    this.intervalId = setInterval(() => {
      this.ping(healthUrl);
    }, intervalMs);
  }

  private async ping(url: string) {
    try {
      this.logger.log(`Sending keep-alive ping to ${url}...`);
      const response = await fetch(url);
      if (response.ok) {
        const data = (await response.json().catch(() => ({}))) as any;
        this.logger.log(`Keep-alive ping successful: status ${response.status}. App Status: ${data?.status || 'unknown'}`);
      } else {
        this.logger.warn(`Keep-alive ping returned non-OK status: ${response.status}`);
      }
    } catch (error) {
      this.logger.error(`Keep-alive ping failed: ${(error as Error).message}`);
    }
  }

  // Clear interval if module is destroyed
  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.logger.log('Keep-alive ping service stopped.');
    }
  }
}
