import { Test, TestingModule } from '@nestjs/testing';
import { InstagramLoginService } from './instagram-login.service';
import { PrismaService } from '../prisma.service';
import { BadRequestException } from '@nestjs/common';
import { GraphClient } from '../modules/meta-platform/clients/graph.client';

describe('InstagramLoginService', () => {
    let service: InstagramLoginService;
    let prismaMock: any;
    let graphClientMock: any;

    beforeEach(async () => {
        prismaMock = {
            instagramAccount: {
                findUnique: jest.fn().mockResolvedValue(null),
                upsert: jest.fn().mockResolvedValue({ id: 'acc-uuid' }),
            },
            instagramProfile: {
                upsert: jest.fn().mockResolvedValue({}),
            },
        };

        graphClientMock = {
            request: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InstagramLoginService,
                { provide: PrismaService, useValue: prismaMock },
                { provide: GraphClient, useValue: graphClientMock },
            ],
        }).compile();

        service = module.get<InstagramLoginService>(InstagramLoginService);

        process.env.META_APP_ID = 'test-app-id';
        process.env.META_APP_SECRET = 'test-app-secret';
        process.env.META_REDIRECT_URI = 'http://test-redirect.com/meta/callback';
        process.env.TOKEN_ENCRYPTION_KEY = '12345678901234567890123456789012';
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getLoginUrl', () => {
        it('should generate a login URL pointing to Meta Dialog but using Instagram scopes', () => {
            const url = service.getLoginUrl();
            expect(url).toContain('https://www.facebook.com/v20.0/dialog/oauth');
            expect(url).toContain('client_id=test-app-id');
            expect(url).toContain('scope=instagram_basic%2Cinstagram_manage_messages%2Cinstagram_manage_comments');
            expect(url).toContain('redirect_uri=http%3A%2F%2Ftest-redirect.com%2Fmeta%2Finstagram-callback');
        });
    });

    describe('fetchShortLivedToken', () => {
        it('should exchange code for short-lived access token group', async () => {
            graphClientMock.request.mockResolvedValue({ access_token: 'short-lived-token' });
            const result = await service.fetchShortLivedToken('my-auth-code');
            expect(graphClientMock.request).toHaveBeenCalledWith({
                method: 'GET',
                endpoint: 'oauth/access_token',
                params: {
                    client_id: 'test-app-id',
                    client_secret: 'test-app-secret',
                    redirect_uri: 'http://test-redirect.com/meta/instagram-callback',
                    code: 'my-auth-code',
                },
            });
            expect(result).toEqual({ access_token: 'short-lived-token' });
        });

        it('should throw BadRequestException if graphClient request throws', async () => {
            graphClientMock.request.mockRejectedValue(new Error('Network error'));
            await expect(service.fetchShortLivedToken('my-auth-code')).rejects.toThrow(BadRequestException);
        });
    });

    describe('fetchLongLivedToken', () => {
        it('should request token exchange for long lived token', async () => {
            graphClientMock.request.mockResolvedValue({ access_token: 'long-lived-token', expires_in: 3600 });
            const result = await service.fetchLongLivedToken('short-lived-token');
            expect(graphClientMock.request).toHaveBeenCalledWith({
                method: 'GET',
                endpoint: 'oauth/access_token',
                params: {
                    grant_type: 'fb_exchange_token',
                    client_id: 'test-app-id',
                    client_secret: 'test-app-secret',
                    fb_exchange_token: 'short-lived-token',
                },
            });
            expect(result).toEqual({ access_token: 'long-lived-token', expires_in: 3600 });
        });
    });

    describe('fetchInstagramProfile', () => {
        it('should query profile of currently authenticated user', async () => {
            const mockProfile = { id: 'ig-user-id', username: 'john_doe' };
            graphClientMock.request.mockResolvedValue(mockProfile);

            const result = await service.fetchInstagramProfile('access-token');
            expect(result).toEqual(mockProfile);
            expect(graphClientMock.request).toHaveBeenCalledWith({
                method: 'GET',
                endpoint: 'me',
                params: {
                    fields: 'id,username,name,profile_picture_url',
                },
                token: 'access-token',
            });
        });
    });

    describe('exchangeCodeAndConnect', () => {
        it('should coordinate the full Instagram login direct flow', async () => {
            graphClientMock.request
                .mockResolvedValueOnce({ access_token: 'short-token' }) // fetchShortLivedToken
                .mockResolvedValueOnce({ access_token: 'long-token', expires_in: 3600 }) // fetchLongLivedToken
                .mockResolvedValueOnce({ id: 'ig-1234', username: 'test_user', name: 'Test User', profile_picture_url: 'pic-url' }); // fetchInstagramProfile

            await service.exchangeCodeAndConnect('my-auth-code');

            expect(prismaMock.instagramAccount.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { instagramUserId: 'ig-1234' },
                    create: expect.objectContaining({
                        instagramUserId: 'ig-1234',
                        pageId: 'instagram_login',
                        pageName: 'test_user',
                    }),
                }),
            );

            expect(prismaMock.instagramProfile.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { instagramAccountId: 'acc-uuid' },
                    create: expect.objectContaining({
                        instagramAccountId: 'acc-uuid',
                        username: 'test_user',
                        name: 'Test User',
                        profilePictureUrl: 'pic-url',
                    }),
                }),
            );
        });
    });
});
