import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

class MockPrismaService {
  private accounts: any[] = [];

  instagramAccount = {
    deleteMany: jest.fn().mockImplementation(() => {
      this.accounts = [];
      return Promise.resolve({ count: 0 });
    }),
    findMany: jest.fn().mockImplementation(() => {
      return Promise.resolve(this.accounts);
    }),
    findFirst: jest.fn().mockImplementation(() => {
      return Promise.resolve(this.accounts[0] || null);
    }),
    upsert: jest.fn().mockImplementation(({ where, create, update }) => {
      const idx = this.accounts.findIndex(
        (a) => a.instagramUserId === where.instagramUserId,
      );
      if (idx >= 0) {
        this.accounts[idx] = {
          ...this.accounts[idx],
          ...update,
          updatedAt: new Date(),
        };
        return Promise.resolve(this.accounts[idx]);
      } else {
        const newAcc = {
          id: '12345678-1234-1234-1234-123456789012',
          ...create,
          connectedAt: new Date(),
          updatedAt: new Date(),
        };
        this.accounts.push(newAcc);
        return Promise.resolve(newAcc);
      }
    }),
    delete: jest.fn().mockImplementation(({ where }) => {
      const idx = this.accounts.findIndex((a) => a.id === where.id);
      if (idx === -1) {
        throw new Error('Not found');
      }
      const [deleted] = this.accounts.splice(idx, 1);
      return Promise.resolve(deleted);
    }),
  };
}

describe('MetaController (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: MockPrismaService;

  beforeAll(async () => {
    process.env.META_APP_ID = 'test-app-id';
    process.env.META_APP_SECRET = 'test-app-secret';
    process.env.META_REDIRECT_URI = 'http://localhost:3001/meta/callback';
    process.env.TOKEN_ENCRYPTION_KEY = '12345678901234567890123456789012';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

    mockPrisma = new MockPrismaService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /meta/login', () => {
    it('redirects to Meta OAuth login dialog URL', async () => {
      const res = await request(app.getHttpServer())
        .get('/meta/login')
        .expect(302);

      expect(res.headers.location).toContain(
        'https://www.facebook.com/v20.0/dialog/oauth',
      );
      expect(res.headers.location).toContain('client_id=test-app-id');
    });
  });

  describe('GET /meta/status', () => {
    it('returns empty array when no accounts are connected', async () => {
      const res = await request(app.getHttpServer())
        .get('/meta/status')
        .expect(200);

      expect(res.body).toEqual({ accounts: [] });
    });
  });

  describe('GET /meta/callback', () => {
    it('redirects with error parameter if no code resides in query', async () => {
      await request(app.getHttpServer())
        .get('/meta/callback')
        .expect(302)
        .expect(
          'Location',
          'http://localhost:3000?error=Authorization%20code%20not%20provided',
        );
    });

    it('redirects with error parameter if Meta returns error parameter', async () => {
      await request(app.getHttpServer())
        .get('/meta/callback?error=access_denied')
        .expect(302)
        .expect('Location', 'http://localhost:3000?error=access_denied');
    });

    it('completes the code verification flow and redirects back to dashboard successfully', async () => {
      const mockFetch = jest
        .spyOn(global, 'fetch')
        .mockImplementation((url: unknown) => {
          const urlStr = String(url);
          if (urlStr.includes('/oauth/access_token')) {
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  access_token: 'mock-long-lived-token-xyz',
                  expires_in: 3600,
                }),
            } as any);
          }
          if (urlStr.includes('/me/accounts')) {
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  data: [
                    {
                      id: 'page-123',
                      name: 'Meta Page One',
                      access_token: 'page-access-token-123',
                    },
                  ],
                }),
            } as any);
          }
          if (urlStr.includes('/page-123')) {
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  id: 'page-123',
                  name: 'Meta Page One',
                  instagram_business_account: {
                    id: 'ig-biz-account-321',
                  },
                }),
            } as any);
          }
          return Promise.resolve({ ok: false } as any);
        });

      await request(app.getHttpServer())
        .get('/meta/callback?code=mock-oauth-code-123')
        .expect(302)
        .expect('Location', 'http://localhost:3000?connected=true');

      mockFetch.mockRestore();

      const dbAccounts = await mockPrisma.instagramAccount.findMany();
      expect(dbAccounts).toHaveLength(1);
      expect(dbAccounts[0].instagramUserId).toBe('ig-biz-account-321');
      expect(dbAccounts[0].pageName).toBe('Meta Page One');
      expect(dbAccounts[0].pageId).toBe('page-123');
      expect(dbAccounts[0].accessTokenEncrypted).toContain(':');
    });
  });

  describe('POST /meta/disconnect', () => {
    it('removes the connected profile link from database', async () => {
      const record = await mockPrisma.instagramAccount.findFirst();
      expect(record).not.toBeNull();

      await request(app.getHttpServer())
        .post('/meta/disconnect')
        .send({ id: record!.id })
        .expect(201);

      const dbAccounts = await mockPrisma.instagramAccount.findMany();
      expect(dbAccounts).toHaveLength(0);
    });

    it('rejects request with invalid or missing body parameter', async () => {
      await request(app.getHttpServer())
        .post('/meta/disconnect')
        .send({})
        .expect(400);

      await request(app.getHttpServer())
        .post('/meta/disconnect')
        .send({ id: 'invalid-uuid-id' })
        .expect(400);
    });
  });
});
