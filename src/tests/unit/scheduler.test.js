import { jest } from '@jest/globals';

// Setup fake timers
jest.useFakeTimers();

// Mock node-cron
const mockCronSchedule = jest.fn();
jest.unstable_mockModule('node-cron', () => ({
    default: {
        schedule: mockCronSchedule
    }
}));

// Mock notification service
const mockNotificationService = {
    sendDailySummary: jest.fn(),
    sendHabitReminder: jest.fn()
};
jest.unstable_mockModule('../../services/notification.service.js', () => ({
    default: mockNotificationService
}));

// Mock models
const mockUser = {
    findAll: jest.fn()
};
const mockHabit = {
    findAll: jest.fn()
};
const mockHabitLog = {
    findOne: jest.fn()
};
jest.unstable_mockModule('../../models/index.js', () => ({
    User: mockUser,
    Habit: mockHabit,
    HabitLog: mockHabitLog
}));

// Dynamically import scheduler
const { startScheduler } = await import('../../services/scheduler.js');

describe('Notification Scheduler Service', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        // Set time to 08:00 AM (Jakarta Time is UTC+7, so set UTC to 01:00 AM)
        const mockDateTime = new Date('2026-05-30T01:00:00Z'); // 2026-05-30 08:00:00 GMT+7
        jest.setSystemTime(mockDateTime);
    });

    test('should register cron job to run every minute', () => {
        startScheduler();
        expect(mockCronSchedule).toHaveBeenCalledWith('* * * * *', expect.any(Function));
    });

    test('should trigger daily summary if user reminderTime matches timezone current time', async () => {
        startScheduler();
        const schedulerCallback = mockCronSchedule.mock.calls[0][1];

        // Mock users: one matches current time (08:00), one does not (09:00)
        mockUser.findAll.mockResolvedValue([
            { id: 'user-1', email: 'user1@example.com', timezone: 'Asia/Jakarta', reminderTime: '08:00:00' },
            { id: 'user-2', email: 'user2@example.com', timezone: 'Asia/Jakarta', reminderTime: '09:00:00' }
        ]);

        // Mock habits list empty for simple testing of daily summary
        mockHabit.findAll.mockResolvedValue([]);

        await schedulerCallback();

        expect(mockUser.findAll).toHaveBeenCalled();
        expect(mockNotificationService.sendDailySummary).toHaveBeenCalledWith('user-1');
        expect(mockNotificationService.sendDailySummary).not.toHaveBeenCalledWith('user-2');
    });

    test('should trigger habit reminder if habit scheduledTime matches current time and not completed today', async () => {
        startScheduler();
        const schedulerCallback = mockCronSchedule.mock.calls[0][1];

        // Mock users list empty for simple testing of habit reminders
        mockUser.findAll.mockResolvedValue([]);

        // Mock habit matching the current time (08:00 in Jakarta)
        mockHabit.findAll.mockResolvedValue([
            {
                id: 'habit-1',
                name: 'Morning Gym',
                userId: 'user-1',
                scheduledTime: '08:00:00',
                user: { timezone: 'Asia/Jakarta', notificationEnabled: true, email: 'user1@example.com' }
            }
        ]);

        // Mock habit log findOne to return null (not completed today yet)
        mockHabitLog.findOne.mockResolvedValue(null);

        await schedulerCallback();

        expect(mockHabit.findAll).toHaveBeenCalled();
        expect(mockHabitLog.findOne).toHaveBeenCalledWith(expect.objectContaining({
            where: { habitId: 'habit-1', userId: 'user-1', date: '2026-05-30' }
        }));
        expect(mockNotificationService.sendHabitReminder).toHaveBeenCalledWith(expect.objectContaining({ id: 'habit-1' }));
    });

    test('should NOT trigger habit reminder if habit is already completed today', async () => {
        startScheduler();
        const schedulerCallback = mockCronSchedule.mock.calls[0][1];

        mockUser.findAll.mockResolvedValue([]);

        mockHabit.findAll.mockResolvedValue([
            {
                id: 'habit-1',
                name: 'Morning Gym',
                userId: 'user-1',
                scheduledTime: '08:00:00',
                user: { timezone: 'Asia/Jakarta', notificationEnabled: true, email: 'user1@example.com' }
            }
        ]);

        // Mock habit log findOne to return existing completed log (already completed today)
        mockHabitLog.findOne.mockResolvedValue({ id: 'log-1', status: 'COMPLETED' });

        await schedulerCallback();

        expect(mockNotificationService.sendHabitReminder).not.toHaveBeenCalled();
    });
});
