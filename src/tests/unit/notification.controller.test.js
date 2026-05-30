import { jest } from '@jest/globals';

// Mock notificationService
const mockNotificationService = {
    saveSubscription: jest.fn(),
    removeSubscription: jest.fn(),
    updatePreferences: jest.fn(),
    getPreferences: jest.fn(),
    sendNotification: jest.fn()
};
jest.unstable_mockModule('../../services/notification.service.js', () => ({
    default: mockNotificationService
}));

// Dynamically import the controller
const { default: notificationController } = await import('../../controllers/notification.controller.js');

describe('NotificationController', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {},
            userId: 'user-123'
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    test('subscribe should save subscription and return it', async () => {
        req.body = { endpoint: 'https://example.com' };
        mockNotificationService.saveSubscription.mockResolvedValue({ id: 'sub-1' });

        await notificationController.subscribe(req, res, next);

        expect(mockNotificationService.saveSubscription).toHaveBeenCalledWith(req.body, 'user-123');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Notification subscription saved successfully',
            subscription: { id: 'sub-1' }
        });
    });

    test('unsubscribe should remove subscription', async () => {
        req.body = { endpoint: 'https://example.com' };
        mockNotificationService.removeSubscription.mockResolvedValue({ id: 'sub-1', endpoint: 'https://example.com' });

        await notificationController.unsubscribe(req, res, next);

        expect(mockNotificationService.removeSubscription).toHaveBeenCalledWith('https://example.com', 'user-123');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Notification subscription removed successfully',
            id: 'sub-1',
            endpoint: 'https://example.com'
        });
    });

    test('updatePreferences should update user settings', async () => {
        req.body = { notificationEnabled: false };
        mockNotificationService.updatePreferences.mockResolvedValue({ notificationEnabled: false, reminderTime: '08:00' });

        await notificationController.updatePreferences(req, res, next);

        expect(mockNotificationService.updatePreferences).toHaveBeenCalledWith(req.body, 'user-123');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Notification preferences updated successfully',
            preferences: { notificationEnabled: false, reminderTime: '08:00' }
        });
    });

    test('getPreferences should retrieve user settings', async () => {
        mockNotificationService.getPreferences.mockResolvedValue({ notificationEnabled: true, reminderTime: '08:00' });

        await notificationController.getPreferences(req, res, next);

        expect(mockNotificationService.getPreferences).toHaveBeenCalledWith('user-123');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            preferences: { notificationEnabled: true, reminderTime: '08:00' }
        });
    });

    test('sendTest should send test notification to user', async () => {
        mockNotificationService.sendNotification.mockResolvedValue();

        await notificationController.sendTest(req, res, next);

        expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
            'user-123',
            expect.objectContaining({ title: '🔔 Test Notification' })
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });
});
