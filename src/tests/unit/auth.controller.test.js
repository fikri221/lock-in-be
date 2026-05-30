import { jest } from '@jest/globals';

// Mock authService
const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    googleLogin: jest.fn(),
    refreshAuthToken: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    logout: jest.fn()
};
jest.unstable_mockModule('../../services/auth.service.js', () => ({
    default: mockAuthService
}));

// Dynamically import the controller after mocking the service
const { default: authController } = await import('../../controllers/auth.controller.js');

describe('AuthController', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {},
            cookies: {},
            headers: {},
            params: {},
            query: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            cookie: jest.fn().mockReturnThis(),
            clearCookie: jest.fn().mockReturnThis()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('register', () => {
        test('should register and set accessToken and refreshToken cookies', async () => {
            req.body = { email: 'test@example.com', name: 'Test', password: 'password' };
            const mockUserResult = {
                user: { id: '1', name: 'Test', email: 'test@example.com' },
                accessToken: 'access-token-123',
                refreshToken: 'refresh-token-456'
            };
            mockAuthService.register.mockResolvedValue(mockUserResult);

            await authController.register(req, res, next);

            expect(mockAuthService.register).toHaveBeenCalledWith(req.body);
            expect(res.cookie).toHaveBeenCalledWith('accessToken', 'access-token-123', expect.any(Object));
            expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'refresh-token-456', expect.any(Object));
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'User registered successfully',
                data: { user: mockUserResult.user }
            });
        });

        test('should forward error to next()', async () => {
            const err = new Error('Registration failed');
            mockAuthService.register.mockRejectedValue(err);

            await authController.register(req, res, next);

            expect(next).toHaveBeenCalledWith(err);
        });
    });

    describe('login', () => {
        test('should login user and set cookies', async () => {
            req.body = { email: 'test@example.com', password: 'password' };
            const mockLoginResult = {
                user: { id: '1', email: 'test@example.com' },
                accessToken: 'at-1',
                refreshToken: 'rt-1'
            };
            mockAuthService.login.mockResolvedValue(mockLoginResult);

            await authController.login(req, res, next);

            expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password');
            expect(res.cookie).toHaveBeenCalledTimes(2);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('googleLogin', () => {
        test('should login with Google credentials', async () => {
            req.body = { credential: 'google-jwt-credential' };
            const mockLoginResult = {
                user: { id: '1', email: 'test@example.com' },
                accessToken: 'at-1',
                refreshToken: 'rt-1'
            };
            mockAuthService.googleLogin.mockResolvedValue(mockLoginResult);

            await authController.googleLogin(req, res, next);

            expect(mockAuthService.googleLogin).toHaveBeenCalledWith('google-jwt-credential');
            expect(res.cookie).toHaveBeenCalledTimes(2);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('refreshToken', () => {
        test('should refresh tokens using incoming refresh cookie', async () => {
            req.cookies.refreshToken = 'old-rt';
            mockAuthService.refreshAuthToken.mockResolvedValue({
                accessToken: 'new-at',
                refreshToken: 'new-rt'
            });

            await authController.refreshToken(req, res, next);

            expect(mockAuthService.refreshAuthToken).toHaveBeenCalledWith('old-rt');
            expect(res.cookie).toHaveBeenCalledWith('accessToken', 'new-at', expect.any(Object));
            expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'new-rt', expect.any(Object));
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('should return 401 if no refresh token cookie is present', async () => {
            await authController.refreshToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'No refresh token provided' });
            expect(mockAuthService.refreshAuthToken).not.toHaveBeenCalled();
        });

        test('should clear cookies and pass to next() if refreshing fails', async () => {
            req.cookies.refreshToken = 'bad-rt';
            const err = new Error('Invalid token');
            mockAuthService.refreshAuthToken.mockRejectedValue(err);

            await authController.refreshToken(req, res, next);

            expect(res.clearCookie).toHaveBeenCalledWith('accessToken');
            expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
            expect(next).toHaveBeenCalledWith(err);
        });
    });

    describe('me', () => {
        test('should return user info if req.user is set', async () => {
            const mockToJSON = jest.fn().mockReturnValue({ id: '1', email: 'test@example.com' });
            req.user = { toJSON: mockToJSON };

            await authController.me(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { user: { id: '1', email: 'test@example.com' } }
            });
        });

        test('should return null user if req.user is not set', async () => {
            req.user = null;

            await authController.me(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { user: null }
            });
        });
    });

    describe('updateProfile', () => {
        test('should update user profile and return user data', async () => {
            req.userId = 'user-123';
            req.body = { name: 'Updated Name' };
            mockAuthService.updateProfile.mockResolvedValue({ id: 'user-123', name: 'Updated Name' });

            await authController.updateProfile(req, res, next);

            expect(mockAuthService.updateProfile).toHaveBeenCalledWith('user-123', req.body);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Profile updated successfully',
                data: { user: { id: 'user-123', name: 'Updated Name' } }
            });
        });
    });

    describe('changePassword', () => {
        test('should change user password successfully', async () => {
            req.userId = 'user-123';
            req.body = { currentPassword: 'old', newPassword: 'new' };
            mockAuthService.changePassword.mockResolvedValue();

            await authController.changePassword(req, res, next);

            expect(mockAuthService.changePassword).toHaveBeenCalledWith('user-123', 'old', 'new');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Password changed successfully'
            });
        });
    });

    describe('logout', () => {
        test('should logout, call service and clear cookies', async () => {
            req.cookies.refreshToken = 'rt-to-del';
            mockAuthService.logout.mockResolvedValue();

            await authController.logout(req, res, next);

            expect(mockAuthService.logout).toHaveBeenCalledWith('rt-to-del');
            expect(res.clearCookie).toHaveBeenCalledWith('accessToken');
            expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('should logout successfully even if no refresh token cookie is present', async () => {
            req.cookies.refreshToken = null;

            await authController.logout(req, res, next);

            expect(mockAuthService.logout).not.toHaveBeenCalled();
            expect(res.clearCookie).toHaveBeenCalledWith('accessToken');
            expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
