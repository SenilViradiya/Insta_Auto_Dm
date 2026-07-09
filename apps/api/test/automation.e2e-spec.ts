jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => ({
      add: jest.fn().mockResolvedValue({ id: 'job-id' }),
      close: jest.fn().mockResolvedValue(undefined),
    })),
    Worker: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    })),
    QueueEvents: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';

class MockPrismaService {
  private automations: any[] = [];

  processedEvent = {
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
  };

  automation = {
    create: jest.fn().mockImplementation(({ data }) => {
      const newAuto = {
        id: '12345678-1234-1234-1234-123456789012',
        instagramAccountId:
          data.instagramAccountId || data.workspaceId || 'default',
        name: data.name,
        description: data.description || '',
        enabled: data.enabled ?? true,
        triggerType: data.triggerType || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        triggers: data.triggers?.create || [],
        conditions: data.conditions?.create || [],
        actions: data.actions?.create || [],
      };
      this.automations.push(newAuto);
      return Promise.resolve(newAuto);
    }),
    findMany: jest.fn().mockImplementation(() => {
      return Promise.resolve(this.automations);
    }),
    count: jest.fn().mockImplementation(() => {
      return Promise.resolve(this.automations.length);
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
        ...data,
        updatedAt: new Date(),
      };

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

  automationTrigger = {
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  };

  automationCondition = {
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  };

  automationAction = {
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  };

  $transaction = jest.fn().mockImplementation((cb) => {
    return cb(this);
  });
}

class MockQueue {
  add = jest.fn().mockResolvedValue({ id: 'job-id' });
}

describe('AutomationController (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: MockPrismaService;
  let mockQueue: MockQueue;

  beforeAll(async () => {
    mockPrisma = new MockPrismaService();
    mockQueue = new MockQueue();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(getQueueToken('automation'))
      .useValue(mockQueue)
      .overrideProvider(getQueueToken('automation-dlq'))
      .useValue(mockQueue)
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

      expect(res.body).toEqual({ total: 0, items: [] });
    });
  });

  describe('POST /automations', () => {
    it('creates an automation successfully with valid payload', async () => {
      const payload = {
        name: 'Welcome Flow',
        description: 'Sends welcome text on keyword',
        enabled: true,
        triggers: [{ eventType: 'KEYWORD_MATCH', enabled: true }],
        conditions: [
          { field: 'message.text', operator: 'CONTAINS', value: 'hello' },
        ],
        actions: [
          {
            actionType: 'SEND_MESSAGE',
            payload: { message: 'Hi! How can we help you today?' },
          },
        ],
      };

      const res = await request(app.getHttpServer())
        .post('/automations')
        .send(payload)
        .expect(201);

      expect(res.body.name).toBe('Welcome Flow');
      expect(res.body.triggers).toHaveLength(1);
      expect(res.body.conditions).toHaveLength(1);
      expect(res.body.actions).toHaveLength(1);
      expect(res.body.id).toBe('12345678-1234-1234-1234-123456789012');
    });

    it('fails validation if payload does not have proper types', async () => {
      await request(app.getHttpServer())
        .post('/automations')
        .send({
          name: 'Flow without triggers',
          actions: [{ actionType: 'SEND_MESSAGE', payload: {} }],
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/automations')
        .send({ name: '', triggers: [], actions: [] })
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

  describe('POST /automations/:id/enable and /disable', () => {
    it('enables and disables the automation flow', async () => {
      let res = await request(app.getHttpServer())
        .post('/automations/12345678-1234-1234-1234-123456789012/enable')
        .expect(201);
      expect(res.body.enabled).toBe(true);

      res = await request(app.getHttpServer())
        .post('/automations/12345678-1234-1234-1234-123456789012/disable')
        .expect(201);
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
