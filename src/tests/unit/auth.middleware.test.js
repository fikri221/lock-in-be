import { jest } from '@jest/globals';

// Mock authService using ES Module mocking
jest.unstable_mockModule('../../services/auth.service.js', () => ({
    default: {
        verifyToken: jest.fn()
    }
}));

// Dynamically import dependencies after mocking
const { auth, optionalAuth } = await import('../../middlewares/auth.js');
const { default: authService } = await import('../../services/auth.service.js');

describe('Auth Middleware - auth', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            cookies: {},
            headers: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    test('should return 401 if no token is provided', async () => {
        await auth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'No authentication token provided' });
        expect(next).not.toHaveBeenCalled();
    });

    test('should authenticate successfully with token from cookies', async () => {
        req.cookies.accessToken = 'cookie-token';
        const mockUser = { id: 'user-123', name: 'John Doe' };
        authService.verifyToken.mockResolvedValue(mockUser);

        await auth(req, res, next);

        expect(authService.verifyToken).toHaveBeenCalledWith('cookie-token');
        expect(req.user).toEqual(mockUser);
        expect(req.userId).toBe('user-123');
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    test('should authenticate successfully with token from authorization header', async () => {
        req.headers.authorization = 'Bearer header-token';
        const mockUser = { id: 'user-456', name: 'Jane Doe' };
        authService.verifyToken.mockResolvedValue(mockUser);

        await auth(req, res, next);

        expect(authService.verifyToken).toHaveBeenCalledWith('header-token');
        expect(req.user).toEqual(mockUser);
        expect(req.userId).toBe('user-456');
        expect(next).toHaveBeenCalled();
    });

    test('should return 401 if token verification fails', async () => {
        req.cookies.accessToken = 'invalid-token';
        const verifyError = new Error('Invalid or expired token');
        verifyError.statusCode = 401;
        authService.verifyToken.mockRejectedValue(verifyError);

        await auth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            error: 'Invalid or expired token',
            details: 'Invalid or expired token'
        });
        expect(next).not.toHaveBeenCalled();
    });
});

describe('Auth Middleware - optionalAuth', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            cookies: {},
            headers: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    test('should set req.user to null and continue if no token is provided', async () => {
        await optionalAuth(req, res, next);

        expect(req.user).toBeNull();
        expect(next).toHaveBeenCalled();
    });

    test('should authenticate and set user if valid token is provided in cookies', async () => {
        req.cookies.accessToken = 'valid-token';
        const mockUser = { id: 'user-789', name: 'Bob' };
        authService.verifyToken.mockResolvedValue(mockUser);

        await optionalAuth(req, res, next);

        expect(req.user).toEqual(mockUser);
        expect(req.userId).toBe('user-789');
        expect(next).toHaveBeenCalled();
    });

    test('should set req.user to null and continue if token verification fails', async () => {
        req.cookies.accessToken = 'bad-token';
        authService.verifyToken.mockRejectedValue(new Error('Invalid token'));

        await optionalAuth(req, res, next);

        expect(req.user).toBeNull();
        expect(next).toHaveBeenCalled();
    });
});
