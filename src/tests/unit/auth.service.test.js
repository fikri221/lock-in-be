import { jest } from '@jest/globals';

// Setup environment variables
process.env.JWT_SECRET = 'testsecretkey';
process.env.GOOGLE_CLIENT_ID = 'testclientid';

// 1. Mock google-auth-library
const mockVerifyIdToken = jest.fn();
jest.unstable_mockModule('google-auth-library', () => ({
    OAuth2Client: jest.fn().mockImplementation(() => ({
        verifyIdToken: mockVerifyIdToken
    }))
}));

// 2. Mock database config (sequelize transactions)
const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn()
};
jest.unstable_mockModule('../../config/database.js', () => ({
    sequelize: {
        transaction: jest.fn().mockResolvedValue(mockTransaction)
    }
}));

// 3. Mock database models
const mockUserInstance = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashed-password',
    comparePassword: jest.fn(),
    update: jest.fn(),
    toJSON: jest.fn().mockReturnValue({ id: 'user-123', name: 'John Doe', email: 'john@example.com' })
};

const mockUser = {
    findOne: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn()
};

const mockRefreshTokenInstance = {
    token: 'refresh-token-val',
    expires_at: new Date(Date.now() + 1000 * 60 * 60),
    update: jest.fn()
};

const mockRefreshToken = {
    findOne: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn()
};

jest.unstable_mockModule('../../models/index.js', () => ({
    User: mockUser,
    RefreshToken: mockRefreshToken
}));

// Dynamically import the service and mocked modules
const { default: authService } = await import('../../services/auth.service.js');
const jwt = (await import('jsonwebtoken')).default;

describe('AuthService', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset expire date for tokens in test
        mockRefreshTokenInstance.expires_at = new Date(Date.now() + 1000 * 60 * 60);
    });

    describe('register', () => {
        test('should register a new user successfully', async () => {
            mockUser.findOne.mockResolvedValue(null); // No existing user
            mockUser.create.mockResolvedValue(mockUserInstance);
            mockRefreshToken.create.mockResolvedValue(mockRefreshTokenInstance);

            const result = await authService.register({
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123'
            });

            expect(mockUser.findOne).toHaveBeenCalledWith({ where: { email: 'john@example.com' } });
            expect(mockUser.create).toHaveBeenCalledWith(
                { name: 'John Doe', email: 'john@example.com', password: 'password123' },
                { transaction: mockTransaction }
            );
            expect(mockTransaction.commit).toHaveBeenCalled();
            expect(result.user).toEqual({ id: 'user-123', name: 'John Doe', email: 'john@example.com' });
            expect(result.accessToken).toBeDefined();
            expect(result.refreshToken).toBeDefined();
        });

        test('should throw error if email is already registered', async () => {
            mockUser.findOne.mockResolvedValue(mockUserInstance); // User exists

            await expect(authService.register({
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123'
            })).rejects.toThrow('Email is already registered');

            expect(mockTransaction.rollback).toHaveBeenCalled();
            expect(mockUser.create).not.toHaveBeenCalled();
        });
    });

    describe('login', () => {
        test('should login user successfully', async () => {
            mockUser.findOne.mockResolvedValue(mockUserInstance);
            mockUserInstance.comparePassword.mockResolvedValue(true);
            mockRefreshToken.create.mockResolvedValue(mockRefreshTokenInstance);

            const result = await authService.login('john@example.com', 'password123');

            expect(mockUser.findOne).toHaveBeenCalledWith({ where: { email: 'john@example.com' } });
            expect(mockUserInstance.comparePassword).toHaveBeenCalledWith('password123');
            expect(result.user).toEqual({ id: 'user-123', name: 'John Doe', email: 'john@example.com' });
            expect(result.accessToken).toBeDefined();
            expect(result.refreshToken).toBeDefined();
        });

        test('should throw 401 if user not found', async () => {
            mockUser.findOne.mockResolvedValue(null);

            await expect(authService.login('john@example.com', 'password123'))
                .rejects.toThrow('Invalid email or password');
        });

        test('should throw 401 if password is invalid', async () => {
            mockUser.findOne.mockResolvedValue(mockUserInstance);
            mockUserInstance.comparePassword.mockResolvedValue(false);

            await expect(authService.login('john@example.com', 'password123'))
                .rejects.toThrow('Invalid email or password');
        });
    });

    describe('googleLogin', () => {
        test('should login existing google user successfully', async () => {
            mockVerifyIdToken.mockResolvedValue({
                getPayload: () => ({ email: 'john@example.com', name: 'John Doe' })
            });
            mockUser.findOne.mockResolvedValue(mockUserInstance);
            mockRefreshToken.create.mockResolvedValue(mockRefreshTokenInstance);

            const result = await authService.googleLogin('google-token-xyz');

            expect(mockVerifyIdToken).toHaveBeenCalledWith({
                idToken: 'google-token-xyz',
                audience: 'testclientid'
            });
            expect(mockUser.findOne).toHaveBeenCalledWith({ where: { email: 'john@example.com' } });
            expect(mockUser.create).not.toHaveBeenCalled();
            expect(result.user).toEqual({ id: 'user-123', name: 'John Doe', email: 'john@example.com' });
        });

        test('should register and login new google user successfully', async () => {
            mockVerifyIdToken.mockResolvedValue({
                getPayload: () => ({ email: 'new@example.com', name: 'New User' })
            });
            mockUser.findOne.mockResolvedValue(null); // User does not exist
            mockUser.create.mockResolvedValue(mockUserInstance);
            mockRefreshToken.create.mockResolvedValue(mockRefreshTokenInstance);

            await authService.googleLogin('google-token-xyz');

            expect(mockUser.create).toHaveBeenCalledWith({
                name: 'New User',
                email: 'new@example.com',
                password: null
            });
        });

        test('should throw 401 if google token verification fails', async () => {
            mockVerifyIdToken.mockRejectedValue(new Error('Google verification error'));

            await expect(authService.googleLogin('bad-google-token'))
                .rejects.toThrow('Invalid Google token');
        });
    });

    describe('verifyToken', () => {
        test('should verify token and return user', async () => {
            const token = jwt.sign({ id: 'user-123' }, 'testsecretkey');
            mockUser.findByPk.mockResolvedValue(mockUserInstance);

            const user = await authService.verifyToken(token);

            expect(mockUser.findByPk).toHaveBeenCalledWith('user-123');
            expect(user).toEqual(mockUserInstance);
        });

        test('should throw 401 if signature validation fails', async () => {
            const badToken = jwt.sign({ id: 'user-123' }, 'wrongkey');

            await expect(authService.verifyToken(badToken))
                .rejects.toThrow('Invalid or expired token');
        });
    });

    describe('refreshAuthToken', () => {
        test('should refresh token successfully and update DB token', async () => {
            const oldRefreshToken = jwt.sign({ id: 'user-123' }, 'testsecretkey');
            mockRefreshToken.findOne.mockResolvedValue(mockRefreshTokenInstance);
            mockRefreshTokenInstance.update.mockResolvedValue(mockRefreshTokenInstance);

            const result = await authService.refreshAuthToken(oldRefreshToken);

            expect(mockRefreshToken.findOne).toHaveBeenCalledWith({ where: { token: oldRefreshToken } });
            expect(mockRefreshTokenInstance.update).toHaveBeenCalled();
            expect(result.accessToken).toBeDefined();
            expect(result.refreshToken).toBeDefined();
        });

        test('should throw 401 if refresh token is not found in database', async () => {
            const oldRefreshToken = jwt.sign({ id: 'user-123' }, 'testsecretkey');
            mockRefreshToken.findOne.mockResolvedValue(null);

            await expect(authService.refreshAuthToken(oldRefreshToken))
                .rejects.toThrow('Refresh token is invalid or expired');
        });

        test('should throw 401 if refresh token is expired', async () => {
            const oldRefreshToken = jwt.sign({ id: 'user-123' }, 'testsecretkey');
            mockRefreshTokenInstance.expires_at = new Date(Date.now() - 1000); // Past date
            mockRefreshToken.findOne.mockResolvedValue(mockRefreshTokenInstance);

            await expect(authService.refreshAuthToken(oldRefreshToken))
                .rejects.toThrow('Refresh token is invalid or expired');
        });
    });

    describe('logout', () => {
        test('should destroy refresh token in DB', async () => {
            await authService.logout('token-to-delete');

            expect(mockRefreshToken.destroy).toHaveBeenCalledWith({ where: { token: 'token-to-delete' } });
        });
    });

    describe('updateProfile', () => {
        test('should update profile excluding password and email', async () => {
            mockUser.findByPk.mockResolvedValue(mockUserInstance);
            mockUserInstance.update.mockResolvedValue(mockUserInstance);

            const result = await authService.updateProfile('user-123', {
                name: 'New Name',
                email: 'hacker@example.com', // Should be ignored
                password: 'newpassword', // Should be ignored
                timezone: 'Europe/London'
            });

            expect(mockUser.findByPk).toHaveBeenCalledWith('user-123');
            expect(mockUserInstance.update).toHaveBeenCalledWith(
                { name: 'New Name', timezone: 'Europe/London' },
                { transaction: mockTransaction }
            );
            expect(mockTransaction.commit).toHaveBeenCalled();
            expect(result).toEqual({ id: 'user-123', name: 'John Doe', email: 'john@example.com' });
        });

        test('should throw 404 if user not found for update', async () => {
            mockUser.findByPk.mockResolvedValue(null);

            await expect(authService.updateProfile('user-123', { name: 'Name' }))
                .rejects.toThrow('User not found');
            expect(mockTransaction.rollback).toHaveBeenCalled();
        });
    });

    describe('changePassword', () => {
        test('should change password if current password is correct', async () => {
            mockUser.findByPk.mockResolvedValue(mockUserInstance);
            mockUserInstance.comparePassword.mockResolvedValue(true);
            mockUserInstance.update.mockResolvedValue(mockUserInstance);

            await authService.changePassword('user-123', 'currentPass', 'newPass');

            expect(mockUserInstance.comparePassword).toHaveBeenCalledWith('currentPass');
            expect(mockUserInstance.update).toHaveBeenCalledWith(
                { password: 'newPass' },
                { transaction: mockTransaction }
            );
            expect(mockTransaction.commit).toHaveBeenCalled();
        });

        test('should throw 401 if current password is incorrect', async () => {
            mockUser.findByPk.mockResolvedValue(mockUserInstance);
            mockUserInstance.comparePassword.mockResolvedValue(false);

            await expect(authService.changePassword('user-123', 'wrongPass', 'newPass'))
                .rejects.toThrow('Current password is incorrect');
            expect(mockTransaction.rollback).toHaveBeenCalled();
        });
    });
});
