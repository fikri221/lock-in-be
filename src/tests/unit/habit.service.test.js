/**
 * Unit Tests for HabitService
 * 
 * This file contains simple unit tests to verify that our HabitService
 * methods work correctly. We'll test the calculateStats method as an example.
 */

import habitService from '../../services/habit.service.js';
import { sequelize } from '../../config/database.js';

afterAll(async () => {
    await sequelize.close();
});

/**
 * Test Suite for createHabit method
 * This tests the habit creation logic
 */
describe('HabitService - createHabit', () => {
    test('should create a new habit', async () => {
        // ARRANGE
        const newHabit = {
            userId: 'd9c95c3b-c488-4a3c-bb04-b9a7ab3a4d43',
            name: 'Test Habit',
            description: 'This is a test habit',
            category: 'WORK'
        };

        // ACT
        const result = await habitService.createHabit(newHabit, newHabit.userId);

        // ASSERT
        expect(result).toBeDefined();
        expect(result.name).toBe('Test Habit');
        expect(result.description).toBe('This is a test habit');
        expect(result.category).toBe('WORK');
        expect(result.userId).toBe(newHabit.userId);
    });
})


/**
 * Test Suite for getHabits method
 * This tests the habit retrieval logic
 */
describe('HabitService - getHabits', () => {
    test('should get habits', async () => {
        // ARRANGE
        const userId = 'd9c95c3b-c488-4a3c-bb04-b9a7ab3a4d43';

        // ACT
        const result = await habitService.getUserHabits(userId);

        // ASSERT
        expect(result).toBeDefined();
    });
})

/**
 * Test Suite for getHabitById method
 * This tests the habit retrieval logic
 */
describe('HabitService - getHabitById', () => {
    test('should get habit by id', async () => {
        // ARRANGE
        const userId = 'd9c95c3b-c488-4a3c-bb04-b9a7ab3a4d43';
        const habitId = '5a8f538e-1da8-4e41-8355-ed28caf1449b';

        // ACT
        const result = await habitService.getHabitById(habitId, userId);

        // ASSERT
        expect(result).toBeDefined();
    });
})

/**
 * Test Suite for updateHabit method
 * This tests the habit update logic
 */
describe('HabitService - updateHabit', () => {
    test('should update habit', async () => {
        // ARRANGE
        const userId = '587dd4f4-e2c8-48bb-b327-09d5a434876f';
        const habitId = 'c8125a16-88c4-4add-a7e3-85f904bdbe39';
        const updatedHabit = {
            name: 'Updated Habit',
            description: 'This is an updated habit',
        };

        // ACT
        const result = await habitService.updateHabit(habitId, userId, updatedHabit);

        // ASSERT
        expect(result).toBeDefined();
        expect(result.name).toBe('Updated Habit');
        expect(result.description).toBe('This is an updated habit');
    });
})

/**
 * Test Suite for getHabitStats method
 * This tests the habit statistics retrieval logic
 */
describe('HabitService - getHabitStats', () => {
    test('should get habit stats', async () => {
        // ARRANGE
        const userId = 'd9c95c3b-c488-4a3c-bb04-b9a7ab3a4d43';
        const habitId = '5a8f538e-1da8-4e41-8355-ed28caf1449b';
        const day = 30;

        // ACT
        const result = await habitService.getHabitStats(habitId, userId, day);

        // ASSERT
        expect(result).toBeDefined();
    });
})

/**
 * Test Suite for calculateStats method
 * This tests the habit statistics calculation logic
 */
describe('HabitService - calculateStats', () => {

    /**
     * Test Case 1: Testing with completed habits
     * The "test" (or "it") function defines a single test
     */
    test('should calculate stats correctly with completed and skipped logs', () => {
        // ARRANGE: Set up test data
        // We create fake log data to test our function
        const mockLogs = [
            { status: 'COMPLETED' },
            { status: 'COMPLETED' },
            { status: 'COMPLETED' },
            { status: 'SKIPPED' },
            { status: 'SKIPPED' }
        ];

        // ACT: Call the method we want to test
        const result = habitService.calculateStats(mockLogs);

        // ASSERT: Check if the result is what we expect
        expect(result.totalLogs).toBe(5);
        expect(result.completedCount).toBe(3);
        expect(result.skippedCount).toBe(2);
        expect(result.completionRate).toBe(60); // 3/5 = 60%
    });

    /**
     * Test Case 2: Testing with empty logs
     */
    test('should return zero stats for empty logs array', () => {
        // ARRANGE
        const emptyLogs = [];

        // ACT
        const result = habitService.calculateStats(emptyLogs);

        // ASSERT
        expect(result.totalLogs).toBe(0);
        expect(result.completedCount).toBe(0);
        expect(result.skippedCount).toBe(0);
        expect(result.completionRate).toBe(0);
    });

    /**
     * Test Case 3: Testing with all completed logs
     */
    test('should return 100% completion rate when all logs are completed', () => {
        // ARRANGE
        const allCompletedLogs = [
            { status: 'COMPLETED' },
            { status: 'COMPLETED' },
            { status: 'COMPLETED' }
        ];

        // ACT
        const result = habitService.calculateStats(allCompletedLogs);

        // ASSERT
        expect(result.totalLogs).toBe(3);
        expect(result.completedCount).toBe(3);
        expect(result.skippedCount).toBe(0);
        expect(result.completionRate).toBe(100); // 3/3 = 100%
    });

    /**
     * Test Case 4: Testing with all skipped logs
     */
    test('should return 0% completion rate when all logs are skipped', () => {
        // ARRANGE
        const allSkippedLogs = [
            { status: 'SKIPPED' },
            { status: 'SKIPPED' }
        ];

        // ACT
        const result = habitService.calculateStats(allSkippedLogs);

        // ASSERT
        expect(result.totalLogs).toBe(2);
        expect(result.completedCount).toBe(0);
        expect(result.skippedCount).toBe(2);
        expect(result.completionRate).toBe(0); // 0/2 = 0%
    });
});

/**
 * Test Suite for isValidTime method
 * This tests the time validation helper
 */
describe('HabitService - isValidTime', () => {

    test('should return true for valid time format', () => {
        // Test various valid times
        expect(habitService.isValidTime('09:30')).toBe(true);
        expect(habitService.isValidTime('00:00')).toBe(true);
        expect(habitService.isValidTime('23:59')).toBe(true);
        expect(habitService.isValidTime('12:00')).toBe(true);
    });

    test('should return false for invalid time format', () => {
        // Test various invalid times
        expect(habitService.isValidTime('25:00')).toBe(false); // Invalid hour
        expect(habitService.isValidTime('12:60')).toBe(false); // Invalid minute
        expect(habitService.isValidTime('9:30')).toBe(false);  // Missing leading zero
        expect(habitService.isValidTime('12:5')).toBe(false);  // Missing leading zero
        expect(habitService.isValidTime('abc')).toBe(false);   // Not a time
        expect(habitService.isValidTime('')).toBe(false);      // Empty string
    });
});
