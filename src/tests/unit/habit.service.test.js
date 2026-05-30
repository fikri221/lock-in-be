import { jest } from '@jest/globals';

// 1. Mock database config (sequelize transactions)
const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn()
};
jest.unstable_mockModule('../../config/database.js', () => ({
    sequelize: {
        transaction: jest.fn().mockResolvedValue(mockTransaction)
    }
}));

// 2. Mock database models
const mockHabitInstance = {
    id: 'habit-123',
    userId: 'user-123',
    name: 'Read Books',
    description: 'Read 10 pages',
    category: 'LEARNING',
    scheduledTime: '08:00',
    isActive: true,
    currentStreak: 2,
    longestStreak: 5,
    totalCompletions: 10,
    habitType: 'boolean',
    targetValue: '1',
    frequency: 'DAILY',
    targetDays: [1, 2, 3, 4, 5],
    update: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
    reload: jest.fn()
};

const mockHabitLogInstance = {
    id: 'log-123',
    habitId: 'habit-123',
    userId: 'user-123',
    logDate: '2026-05-30',
    status: 'COMPLETED',
    actualValue: 1,
    update: jest.fn(),
    destroy: jest.fn()
};

const mockMoodLogInstance = {
    id: 'mood-123',
    userId: 'user-123',
    logDate: '2026-05-30',
    mood: 4,
    energy: 5,
    notes: 'Feeling good'
};

const mockHabit = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn()
};

const mockHabitLog = {
    findOne: jest.fn(),
    findAll: jest.fn(),
    upsert: jest.fn()
};

const mockMoodEnergyLog = {
    upsert: jest.fn()
};

jest.unstable_mockModule('../../models/index.js', () => ({
    Habit: mockHabit,
    HabitLog: mockHabitLog
}));

jest.unstable_mockModule('../../models/MoodEnergyLog.js', () => ({
    default: mockMoodEnergyLog
}));

// Dynamically import the service and mocked modules
const { default: habitService } = await import('../../services/habit.service.js');

describe('HabitService Unit Tests', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createHabit', () => {
        test('should create a new habit with valid time', async () => {
            const habitData = {
                name: 'Read Books',
                category: 'LEARNING',
                scheduledTime: '08:00'
            };
            mockHabit.create.mockResolvedValue(mockHabitInstance);

            const result = await habitService.createHabit(habitData, 'user-123');

            expect(mockHabit.create).toHaveBeenCalledWith(
                { ...habitData, userId: 'user-123' },
                { transaction: mockTransaction }
            );
            expect(mockTransaction.commit).toHaveBeenCalled();
            expect(result).toEqual(mockHabitInstance);
        });

        test('should throw error for invalid scheduled time format', async () => {
            const habitData = {
                name: 'Read Books',
                scheduledTime: '25:00' // Invalid time
            };

            await expect(habitService.createHabit(habitData, 'user-123'))
                .rejects.toThrow('Invalid scheduled time format. Use HH:MM format.');

            expect(mockHabit.create).not.toHaveBeenCalled();
            expect(mockTransaction.rollback).toHaveBeenCalled();
        });
    });

    describe('getUserHabits', () => {
        test('should retrieve user habits with filters', async () => {
            mockHabit.findAll.mockResolvedValue([mockHabitInstance]);

            const result = await habitService.getUserHabits('user-123', { active: 'true' });

            expect(mockHabit.findAll).toHaveBeenCalledWith(expect.objectContaining({
                where: { userId: 'user-123', isActive: true }
            }));
            expect(result).toEqual([mockHabitInstance]);
        });
    });

    describe('getHabitById', () => {
        test('should retrieve habit by id', async () => {
            mockHabit.findOne.mockResolvedValue(mockHabitInstance);

            const result = await habitService.getHabitById('habit-123', 'user-123');

            expect(mockHabit.findOne).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'habit-123', userId: 'user-123' }
            }));
            expect(result).toEqual(mockHabitInstance);
        });

        test('should throw 404 error if habit is not found', async () => {
            mockHabit.findOne.mockResolvedValue(null);

            await expect(habitService.getHabitById('nonexistent-habit', 'user-123'))
                .rejects.toThrow('Habit not found');
        });
    });

    describe('updateHabit', () => {
        test('should update habit successfully', async () => {
            mockHabit.findOne.mockResolvedValue(mockHabitInstance);
            mockHabitInstance.update.mockResolvedValue(mockHabitInstance);

            const result = await habitService.updateHabit('habit-123', 'user-123', { name: 'Read Manga' });

            expect(mockHabitInstance.update).toHaveBeenCalledWith(
                { name: 'Read Manga' },
                { transaction: mockTransaction }
            );
            expect(mockTransaction.commit).toHaveBeenCalled();
            expect(result).toEqual(mockHabitInstance);
        });
    });

    describe('deleteHabit', () => {
        test('should soft delete habit by setting isActive to false', async () => {
            mockHabit.findOne.mockResolvedValue(mockHabitInstance);
            mockHabitInstance.update.mockResolvedValue(mockHabitInstance);

            await habitService.deleteHabit('habit-123', 'user-123');

            expect(mockHabitInstance.update).toHaveBeenCalledWith(
                { isActive: false },
                { transaction: mockTransaction }
            );
            expect(mockTransaction.commit).toHaveBeenCalled();
        });
    });

    describe('logHabitCompletion', () => {
        test('should log completion and increment completions and streaks', async () => {
            mockHabit.findOne.mockResolvedValue(mockHabitInstance);
            mockHabitLog.findOne.mockResolvedValue(null); // No existing log
            mockHabitLog.upsert.mockResolvedValue([mockHabitLogInstance, true]); // created = true
            mockHabitInstance.increment.mockResolvedValue(mockHabitInstance);
            mockHabitInstance.reload.mockResolvedValue(mockHabitInstance);
            // Mock yesterday log to be null -> sets streak to 1
            mockHabitLog.findOne.mockResolvedValueOnce(null);

            const result = await habitService.logHabitCompletion('habit-123', 'user-123', {
                status: 'COMPLETED',
                logDate: '2026-05-30'
            });

            expect(mockHabitLog.upsert).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'COMPLETED', logDate: '2026-05-30' }),
                { returning: true, transaction: mockTransaction }
            );
            expect(mockHabitInstance.increment).toHaveBeenCalledWith('totalCompletions', { transaction: mockTransaction });
            expect(mockHabitInstance.increment).toHaveBeenCalledWith('currentStreak', { transaction: mockTransaction });
            expect(mockTransaction.commit).toHaveBeenCalled();
            expect(result.habitLog).toEqual(mockHabitLogInstance);
        });
    });

    describe('logMoodEnergy', () => {
        test('should log mood and energy successfully', async () => {
            mockMoodEnergyLog.upsert.mockResolvedValue([mockMoodLogInstance, true]);

            const result = await habitService.logMoodEnergy('user-123', {
                mood: 4,
                energy: 5,
                notes: 'Feeling good'
            });

            expect(mockMoodEnergyLog.upsert).toHaveBeenCalledWith(
                expect.objectContaining({ mood: 4, energy: 5, notes: 'Feeling good' }),
                { returning: true, transaction: mockTransaction }
            );
            expect(result.moodEnergyLog).toEqual(mockMoodLogInstance);
        });
    });

    describe('cancelCompletion', () => {
        test('should cancel habit completion, changing status to CANCELLED', async () => {
            mockHabit.findOne.mockResolvedValue(mockHabitInstance);
            mockHabitLog.findOne.mockResolvedValue(mockHabitLogInstance); // completed log exists
            mockHabitLogInstance.update.mockResolvedValue(mockHabitLogInstance);

            const result = await habitService.cancelCompletion('habit-123', 'user-123', {
                cancelledReason: 'sick',
                logDate: '2026-05-30'
            });

            expect(mockHabitLogInstance.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'CANCELLED', cancelledReason: 'sick' }),
                { transaction: mockTransaction }
            );
            expect(mockHabitInstance.decrement).toHaveBeenCalledWith('totalCompletions', { transaction: mockTransaction });
            expect(mockHabitInstance.decrement).toHaveBeenCalledWith('currentStreak', { transaction: mockTransaction });
            expect(mockTransaction.commit).toHaveBeenCalled();
            expect(result).toEqual(mockHabitLogInstance);
        });
    });

    describe('getHabitStats & analytical charts', () => {
        test('should calculate statistics and return stats report', async () => {
            mockHabit.findOne.mockResolvedValue(mockHabitInstance);
            mockHabitLog.findAll.mockResolvedValue([
                { status: 'COMPLETED', logDate: '2026-05-29' },
                { status: 'COMPLETED', logDate: '2026-05-30' }
            ]);

            const result = await habitService.getHabitStats('habit-123', 'user-123', 7);

            expect(result.habit.name).toBe('Read Books');
            expect(result.stats.totalLogs).toBe(2);
            expect(result.stats.completedCount).toBe(2);
            expect(result.stats.completionRate).toBe(100);
        });

        test('should generate heatmap data', async () => {
            mockHabit.findOne.mockResolvedValue(mockHabitInstance);
            mockHabitLog.findAll.mockResolvedValue([
                { logDate: '2026-05-30', status: 'COMPLETED', actualValue: 1 }
            ]);

            const result = await habitService.getHabitHeatmap('habit-123', 'user-123', 30);

            expect(result.heatmapData).toEqual([{ date: '2026-05-30', status: 'COMPLETED', actualValue: 1 }]);
            expect(result.targetValue).toBe('1');
        });

        test('should generate target chart data', async () => {
            mockHabit.findOne.mockResolvedValue(mockHabitInstance);
            mockHabitLog.findAll.mockResolvedValue([
                { status: 'COMPLETED', actualValue: 1, logDate: '2026-05-30' }
            ]);

            const result = await habitService.getTargetChart('habit-123', 'user-123');

            expect(result.result).toBeDefined();
            expect(result.result.today).toBeDefined();
            expect(result.result.week).toBeDefined();
        });

        test('should generate score chart data', async () => {
            mockHabit.findOne.mockResolvedValue(mockHabitInstance);
            mockHabitLog.findAll.mockResolvedValue([
                { status: 'COMPLETED', actualValue: 1, logDate: '2026-05-30' }
            ]);

            const result = await habitService.getScoreChart('habit-123', 'user-123', 'day');

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
        });

        test('should generate history chart data', async () => {
            mockHabit.findOne.mockResolvedValue(mockHabitInstance);
            mockHabitLog.findAll.mockResolvedValue([
                { status: 'COMPLETED', actualValue: 1, logDate: '2026-05-30' }
            ]);

            const result = await habitService.getHistoryChart('habit-123', 'user-123', 'day');

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
        });

        test('should generate calendar chart data', async () => {
            mockHabit.findOne.mockResolvedValue(mockHabitInstance);
            mockHabitLog.findAll.mockResolvedValue([
                { status: 'COMPLETED', actualValue: 1, logDate: '2026-05-30' }
            ]);

            const result = await habitService.getCalendarChart('habit-123', 'user-123', 3);

            expect(result.heatmapData).toBeDefined();
        });

        test('should generate frequency chart data', async () => {
            mockHabit.findOne.mockResolvedValue(mockHabitInstance);
            mockHabitLog.findAll.mockResolvedValue([
                { status: 'COMPLETED', actualValue: 1, logDate: '2026-05-30' }
            ]);

            const result = await habitService.getFrequencyChart('habit-123', 'user-123');

            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('calculateStats helper', () => {
        test('should compute stats with completed and skipped logs correctly', () => {
            const logs = [
                { status: 'COMPLETED', logDate: '2026-05-25' },
                { status: 'SKIPPED', logDate: '2026-05-26' },
                { status: 'COMPLETED', logDate: '2026-05-27' }
            ];

            const result = habitService.calculateStats(logs);

            expect(result.totalLogs).toBe(3);
            expect(result.completedCount).toBe(2);
            expect(result.skippedCount).toBe(1);
            expect(result.completionRate).toBe(67);
            expect(result.bestDay).toBeDefined();
        });

        test('should return empty stats structure for empty logs array', () => {
            const result = habitService.calculateStats([]);

            expect(result.totalLogs).toBe(0);
            expect(result.completedCount).toBe(0);
            expect(result.skippedCount).toBe(0);
            expect(result.completionRate).toBe(0);
            expect(result.bestDay).toBeNull();
        });
    });

    describe('isValidTime helper', () => {
        test('should validate correct HH:MM format', () => {
            expect(habitService.isValidTime('09:30')).toBe(true);
            expect(habitService.isValidTime('23:59')).toBe(true);
        });

        test('should reject invalid times', () => {
            expect(habitService.isValidTime('24:00')).toBe(false);
            expect(habitService.isValidTime('12:60')).toBe(false);
            expect(habitService.isValidTime('9:30')).toBe(false);
            expect(habitService.isValidTime('abc')).toBe(false);
        });
    });
});
