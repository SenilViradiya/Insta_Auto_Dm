import { Injectable } from '@nestjs/common';
import { TokenService as MetaTokenService } from '../../meta-platform/services/token.service';

@Injectable()
export class TokenService {
  constructor(private readonly metaTokenService: MetaTokenService) {}

  async getToken(instagramAccountId: string): Promise<string> {
    return this.metaTokenService.getToken(instagramAccountId);
  }

  async invalidateCache(instagramAccountId: string): Promise<void> {
    return this.metaTokenService.invalidateCache(instagramAccountId);
  }

  async onModuleDestroy() {
    // Handled by MetaTokenService lifecycle
  }
}
