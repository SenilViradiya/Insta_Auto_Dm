import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

class MockPrismaService {
  private automations: any[] = [];

  automation = {
    create: jest.fn().mockImplementation(({ data }) => {
      const newAuto = {
        id: '12345678-1234-1234-1234-123456789012',
        name: data.name,
        enabled: data.enabled ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
        keywords:
          data.keywords?.create?.map((kw: any) => ({
            id: 'kw-1',
            ...kw,
          })) || [],
        actions:
          data.actions?.create?.map((act: any) => ({
            id: 'act-1',
            ...act,
          })) || [],
      };
      this.automations.push(newAuto);
      return Promise.resolve(newAuto);
    }),
    findMany: jest.fn().mockImplementation(() => {
      return Promise.resolve(this.automations);
    }),
    findUnique: jest.fn().mockImplementation(({ where }) => {
      return Promise.resolve(
        this.automations.find((a) => a.id === where.id) || null,
      );
    }),
    update: jest.fn().mockImplementation(({ where, data }) => {
      const idx = this.automations.findIndex((a) => a.id === where.id);
      if (idx === -1) throw new Error('Not found');

      const prev = this.automations[idx];
      const updated = {
        ...prev,
        name: data.name ?? prev.name,
        enabled: data.enabled ?? prev.enabled,
        updatedAt: new Date(),
      };

      if (data.keywords?.create) {
        updated.keywords = data.keywords.create.map((kw: any) => ({
          id: 'kw-new',
          ...kw,
        }));
      }
      if (data.actions?.create) {
        updated.actions = data.actions.create.map((act: any) => ({
          id: 'act-new',
          ...act,
        }));
      }

      this.automations[idx] = updated;
      return Promise.resolve(updated);
    }),
    delete: jest.fn().mockImplementation(({ where }) => {
      const idx = this.automations.findIndex((a) => a.id === where.id);
      if (idx === -1) throw new Error('Not found');
      const [deleted] = this.automations.splice(idx, 1);
      return Promise.resolve(deleted);
    }),
  };

  automationKeyword = {
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  };

  automationAction = {
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  };

  $transaction = jest.fn().mockImplementation((cb) => {
    return cb(this);
  });
}

describe('AutomationController (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: MockPrismaService;

  beforeAll(async () => {
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

  describe('GET /automations', () => {
    it('returns an empty array initially', async () => {
      const res = await request(app.getHttpServer())
        .get('/automations')
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });

  describe('POST /automations', () => {
    it('creates an automation successfully with valid payload', async () => {
      const payload = {
        name: 'Welcome Flow',
        enabled: true,
        keywords: [
          { keyword: 'hello', matchType: 'EXACT' },
          { keyword: 'hi', matchType: 'STARTS_WITH' },
        ],
        actions: [
          { message: 'Hi! How can we help you today?', delaySeconds: 2 },
        ],
      };

      const res = await request(app.getHttpServer())
        .post('/automations')
        .send(payload)
        .expect(201);

      expect(res.body.name).toBe('Welcome Flow');
      expect(res.body.keywords).toHaveLength(2);
      expect(res.body.actions).toHaveLength(1);
      expect(res.body.id).toBe('12345678-1234-1234-1234-123456789012');
    });

    it('fails validation if payload does not have proper types', async () => {
      await request(app.getHttpServer())
        .post('/automations')
        .send({ name: 'Flow without keywords', actions: [{ message: 'Hi' }] })
        .expect(400);

      await request(app.getHttpServer())
        .post('/automations')
        .send({ name: '', keywords: [], actions: [] })
        .expect(400);
    });
  });

  describe('GET /automations/:id', () => {
    it('returns details if id is valid and matches', async () => {
      const res = await request(app.getHttpServer())
        .get('/automations/12345678-1234-1234-1234-123456789012')
        .expect(200);

      expect(res.body.name).toBe('Welcome Flow');
    });

    it('throws 400 if uuid format is invalid', async () => {
      await request(app.getHttpServer())
        .get('/automations/invalid-uuid-id')
        .expect(400);
    });

    it('throws 404 if item does not exist', async () => {
      await request(app.getHttpServer())
        .get('/automations/99999999-9999-9999-9999-999999999999')
        .expect(404);
    });
  });

  describe('PATCH /automations/:id', () => {
    it('updates attributes correctly', async () => {
      const res = await request(app.getHttpServer())
        .patch('/automations/12345678-1234-1234-1234-123456789012')
        .send({ name: 'Updated Welcome Flow', enabled: false })
        .expect(200);

      expect(res.body.name).toBe('Updated Welcome Flow');
      expect(res.body.enabled).toBe(false);
    });
  });

  describe('DELETE /automations/:id', () => {
    it('deletes the item correctly', async () => {
      await request(app.getHttpServer())
        .delete('/automations/12345678-1234-1234-1234-123456789012')
        .expect(200);

      // Verify not found on subsequent get
      await request(app.getHttpServer())
        .get('/automations/12345678-1234-1234-1234-123456789012')
        .expect(404);
    });
  });
});
