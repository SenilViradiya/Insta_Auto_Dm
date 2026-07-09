import { Test, TestingModule } from '@nestjs/testing';
import { AutomationService } from './automation.service';
import { PrismaService } from '../prisma.service';
import { NotFoundException } from '@nestjs/common';
import { MatchType } from '@prisma/client';

describe('AutomationService', () => {
  let service: AutomationService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      automation: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      automationKeyword: {
        deleteMany: jest.fn(),
      },
      automationAction: {
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(prismaMock)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AutomationService>(AutomationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create automation with nested keywords and actions', async () => {
      const payload = {
        name: 'Promo Auto',
        keywords: [{ keyword: 'promo', matchType: MatchType.EXACT }],
        actions: [{ message: 'Got discount!', delaySeconds: 0 }],
      };

      const mockResponse = { id: 'auto-id-1', ...payload };
      prismaMock.automation.create.mockResolvedValue(mockResponse);

      const result = await service.create(payload);
      expect(result).toEqual(mockResponse);
      expect(prismaMock.automation.create).toHaveBeenCalledWith({
        data: {
          name: payload.name,
          enabled: true,
          keywords: {
            create: [{ keyword: 'promo', matchType: 'EXACT' }],
          },
          actions: {
            create: [{ message: 'Got discount!', delaySeconds: 0 }],
          },
        },
        include: { keywords: true, actions: true },
      });
    });
  });

  describe('findOne', () => {
    it('should return record if found', async () => {
      const mockObj = { id: 'uuid-1', name: 'Auto' };
      prismaMock.automation.findUnique.mockResolvedValue(mockObj);
      const result = await service.findOne('uuid-1');
      expect(result).toBe(mockObj);
    });

    it('should throw NotFoundException if not found', async () => {
      prismaMock.automation.findUnique.mockResolvedValue(null);
      await expect(service.findOne('uuid-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
