import { Test, TestingModule } from '@nestjs/testing';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { BadRequestException } from '@nestjs/common';

describe('AutomationController', () => {
  let controller: AutomationController;
  let serviceMock: any;

  beforeEach(async () => {
    serviceMock = {
      create: jest
        .fn()
        .mockImplementation((d) => Promise.resolve({ id: 'uuid-1', ...d })),
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest
        .fn()
        .mockImplementation((id) => Promise.resolve({ id, name: 'Mock' })),
      update: jest
        .fn()
        .mockImplementation((id, d) => Promise.resolve({ id, ...d })),
      remove: jest.fn().mockResolvedValue({ deleted: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AutomationController],
      providers: [{ provide: AutomationService, useValue: serviceMock }],
    }).compile();

    controller = module.get<AutomationController>(AutomationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should successfully parse valid parameters and execute create', async () => {
      const payload = {
        name: 'Auto 1',
        enabled: true,
        keywords: [{ keyword: 'sale', matchType: 'CONTAINS' }],
        actions: [{ message: 'Check this sale page!', delaySeconds: 5 }],
      };

      const result = await controller.create(payload);
      expect(serviceMock.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'uuid-1');
    });

    it('should fail and throw BadRequestException if arguments are invalid', async () => {
      await expect(controller.create({})).rejects.toThrow(BadRequestException);

      await expect(
        controller.create({ name: 'Auto', actions: [{ message: '123' }] }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
