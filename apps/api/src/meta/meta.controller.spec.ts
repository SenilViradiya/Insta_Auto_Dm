import { Test, TestingModule } from '@nestjs/testing';
import { MetaController } from './meta.controller';
import { MetaService } from './meta.service';
import { BadRequestException } from '@nestjs/common';

describe('MetaController', () => {
  let controller: MetaController;
  let metaServiceMock: any;

  beforeEach(async () => {
    metaServiceMock = {
      getLoginUrl: jest.fn().mockReturnValue('https://meta.oauth.url'),
      exchangeCodeAndConnect: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockResolvedValue([]),
      disconnect: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetaController],
      providers: [{ provide: MetaService, useValue: metaServiceMock }],
    }).compile();

    controller = module.get<MetaController>(MetaController);
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return login URL for redirect decorators', () => {
      const result = controller.login();
      expect(result).toEqual({ url: 'https://meta.oauth.url' });
      expect(metaServiceMock.getLoginUrl).toHaveBeenCalled();
    });
  });

  describe('callback', () => {
    it('should redirect back to frontend with error if authorization code is missing', async () => {
      const mockRes: any = { redirect: jest.fn() };
      await controller.callback(undefined, undefined, mockRes);
      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:3000?error=Authorization%20code%20not%20provided',
      );
    });

    it('should redirect back to frontend with error if Meta returns an error', async () => {
      const mockRes: any = { redirect: jest.fn() };
      await controller.callback(undefined, 'access_denied', mockRes);
      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:3000?error=access_denied',
      );
    });

    it('should process code, encrypt and redirect back with connected=true', async () => {
      const mockRes: any = { redirect: jest.fn() };
      await controller.callback('auth-code-value', undefined, mockRes);
      expect(metaServiceMock.exchangeCodeAndConnect).toHaveBeenCalledWith(
        'auth-code-value',
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:3000?connected=true',
      );
    });

    it('should redirect with error parameter when service processing fails', async () => {
      const mockRes: any = { redirect: jest.fn() };
      metaServiceMock.exchangeCodeAndConnect.mockRejectedValue(
        new Error('OAuth Exchange Failed'),
      );
      await controller.callback('auth-code-value', undefined, mockRes);
      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:3000?error=OAuth%20Exchange%20Failed',
      );
    });
  });

  describe('status', () => {
    it('should return list of connected accounts', async () => {
      const mockAccounts = [{ id: 'id-1', pageName: 'Demo Page' }];
      metaServiceMock.getStatus.mockResolvedValue(mockAccounts);
      const result = await controller.status();
      expect(result).toEqual({ accounts: mockAccounts });
    });
  });

  describe('disconnect', () => {
    it('should successfully disconnect a page if uuid is valid', async () => {
      const body = { id: '12345678-1234-1234-1234-123456789012' };
      const result = await controller.disconnect(body);
      expect(metaServiceMock.disconnect).toHaveBeenCalledWith(body.id);
      expect(result).toEqual({ success: true });
    });

    it('should fail validation and throw BadRequestException if body is empty or invalid uuid', async () => {
      await expect(controller.disconnect({})).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        controller.disconnect({ id: 'invalid-uuid' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
