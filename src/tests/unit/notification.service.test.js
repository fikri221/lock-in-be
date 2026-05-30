import { jest } from '@jest/globals';

// Mock web-push
const mockSendNotification = jest.fn();
const mockSetVapidDetails = jest.fn();
jest.unstable_mockModule('web-push', () => ({
    default: {
        setVapidDetails: mockSetVapidDetails,
        sendNotification: mockSendNotification
    }
}));

// Mock database config
const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn()
};
jest.unstable_mockModule('../../config/database.js', () => ({
    sequelize: {
        transaction: jest.fn().mockResolvedValue(mockTransaction)
    }
}));

// Mock database models
const mockPushSubscriptionInstance = {
    id: 'sub-123',
    userId: 'user-123',
    endpoint: 'https://example.com/endpoint',
    p256dh: 'keys-p256dh',
    auth: 'keys-auth',
    destroy: jest.fn()
};

const mockUserInstance = {
    id: 'user-123',
    notificationEnabled: true,
    reminderTime: '08:00',
    update: jest.fn()
};

const mockPushSubscription = {
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn()
};

const mockUser = {
    findByPk: jest.fn()
};

jest.unstable_mockModule('../../models/index.js', () => ({
    PushSubscription: mockPushSubscription,
    User: mockUser
}));

// Setup process env keys for vapid
process.env.VAPID_EMAIL = 'test@example.com';
process.env.VAPID_PUBLIC_KEY = 'pubkey';
process.env.VAPID_PRIVATE_KEY = 'privkey';

// Dynamically import the service and mocked modules
const { default: notificationService } = await import('../../services/notification.service.js');

describe('NotificationService', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('saveSubscription', () => {
        test('should save a push subscription successfully', async () => {
            const subscriptionData = {
                endpoint: 'https://example.com/endpoint',
                keys: { p256dh: 'p256', auth: 'auth' }
            };
            mockPushSubscription.create.mockResolvedValue(mockPushSubscriptionInstance);

            const result = await notificationService.saveSubscription(subscriptionData, 'user-123');

            expect(mockPushSubscription.create).toHaveBeenCalledWith(
                { userId: 'user-123', ...subscriptionData },
                { transaction: mockTransaction }
            );
            expect(mockTransaction.commit).toHaveBeenCalled();
            expect(result).toEqual(mockPushSubscriptionInstance);
        });

        test('should rollback transaction on error', async () => {
            mockPushSubscription.create.mockRejectedValue(new Error('DB error'));

            await expect(notificationService.saveSubscription({}, 'user-123'))
                .rejects.toThrow('DB error');

            expect(mockTransaction.rollback).toHaveBeenCalled();
        });
    });

    describe('removeSubscription', () => {
        test('should remove a subscription if found', async () => {
            mockPushSubscription.findOne.mockResolvedValue(mockPushSubscriptionInstance);

            const result = await notificationService.removeSubscription('https://example.com/endpoint', 'user-123');

            expect(mockPushSubscription.findOne).toHaveBeenCalledWith({
                where: { endpoint: 'https://example.com/endpoint', userId: 'user-123' }
            });
            expect(mockPushSubscriptionInstance.destroy).toHaveBeenCalledWith({ transaction: mockTransaction });
            expect(mockTransaction.commit).toHaveBeenCalled();
            expect(result).toEqual(mockPushSubscriptionInstance);
        });

        test('should throw 404 error if subscription is not found', async () => {
            mockPushSubscription.findOne.mockResolvedValue(null);

            await expect(notificationService.removeSubscription('https://example.com/endpoint', 'user-123'))
                .rejects.toThrow('Subscription not found');

            expect(mockPushSubscriptionInstance.destroy).not.toHaveBeenCalled();
            expect(mockTransaction.rollback).toHaveBeenCalled();
        });
    });

    describe('sendNotification', () => {
        test('should loop over user subscriptions and call webpush.sendNotification', async () => {
            mockPushSubscription.findAll.mockResolvedValue([mockPushSubscriptionInstance]);
            mockSendNotification.mockResolvedValue({ success: true });

            await notificationService.sendNotification('user-123', { title: 'Hello' });

            expect(mockPushSubscription.findAll).toHaveBeenCalledWith({
                where: { userId: 'user-123', isActive: true }
            });
            expect(mockSendNotification).toHaveBeenCalledWith(
                {
                    endpoint: mockPushSubscriptionInstance.endpoint,
                    keys: {
                        p256dh: mockPushSubscriptionInstance.p256dh,
                        auth: mockPushSubscriptionInstance.auth
                    }
                },
                JSON.stringify({ title: 'Hello' })
            );
        });

        test('should delete subscription if webpush returns 410 Expired status code', async () => {
            mockPushSubscription.findAll.mockResolvedValue([mockPushSubscriptionInstance]);
            const error = new Error('Subscription expired');
            error.statusCode = 410;
            mockSendNotification.mockRejectedValue(error);

            await notificationService.sendNotification('user-123', { title: 'Hello' });

            expect(mockSendNotification).toHaveBeenCalled();
            expect(mockPushSubscriptionInstance.destroy).toHaveBeenCalled();
        });
    });

    describe('getPreferences & updatePreferences', () => {
        test('should retrieve preferences successfully', async () => {
            mockUser.findByPk.mockResolvedValue(mockUserInstance);

            const result = await notificationService.getPreferences('user-123');

            expect(mockUser.findByPk).toHaveBeenCalledWith('user-123');
            expect(result).toEqual({
                notificationEnabled: true,
                reminderTime: '08:00'
            });
        });

        test('should update preferences successfully', async () => {
            mockUser.findByPk.mockResolvedValue(mockUserInstance);
            mockUserInstance.update.mockResolvedValue(mockUserInstance);

            const result = await notificationService.updatePreferences(
                { notificationEnabled: false, reminderTime: '09:00' },
                'user-123'
            );

            expect(mockUserInstance.update).toHaveBeenCalledWith(
                { notificationEnabled: false, reminderTime: '09:00' },
                { transaction: mockTransaction }
            );
            expect(mockTransaction.commit).toHaveBeenCalled();
            expect(result).toEqual({
                notificationEnabled: true, // mockInstance state is mock property (doesn't mutate in mock setup unless explicitly mocked, but verifies logic passes)
                reminderTime: '08:00'
            });
        });
    });

    describe('notification triggers', () => {
        test('should send daily summary with correct payload', async () => {
            mockPushSubscription.findAll.mockResolvedValue([]); // Prevent actually iterating mock subscriptions
            const spySend = jest.spyOn(notificationService, 'sendNotification').mockResolvedValue();

            await notificationService.sendDailySummary('user-123');

            expect(spySend).toHaveBeenCalledWith('user-123', expect.objectContaining({
                title: '☀️ Daily Habit Summary',
                body: expect.any(String)
            }));
        });

        test('should send habit reminder with correct payload', async () => {
            const mockHabitObj = { id: 'habit-123', name: 'Exercise', userId: 'user-123' };
            const spySend = jest.spyOn(notificationService, 'sendNotification').mockResolvedValue();

            await notificationService.sendHabitReminder(mockHabitObj);

            expect(spySend).toHaveBeenCalledWith('user-123', expect.objectContaining({
                title: '⏰ Reminder: Exercise',
                body: expect.stringContaining('Exercise')
            }));
        });
    });
});
