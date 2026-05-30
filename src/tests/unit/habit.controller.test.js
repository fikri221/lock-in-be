import { jest } from '@jest/globals';

// Mock habitService
const mockHabitService = {
    getUserHabits: jest.fn(),
    getHabitById: jest.fn(),
    createHabit: jest.fn(),
    updateHabit: jest.fn(),
    deleteHabit: jest.fn(),
    logMoodEnergy: jest.fn(),
    logHabitCompletion: jest.fn(),
    cancelCompletion: jest.fn(),
    getHabitStats: jest.fn(),
    getHabitHeatmap: jest.fn(),
    getTargetChart: jest.fn(),
    getScoreChart: jest.fn(),
    getHistoryChart: jest.fn(),
    getCalendarChart: jest.fn(),
    getFrequencyChart: jest.fn()
};
jest.unstable_mockModule('../../services/habit.service.js', () => ({
    default: mockHabitService
}));

// Dynamically import the controller after mocking the service
const { default: habitController } = await import('../../controllers/habit.controller.js');

describe('HabitController', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {},
            cookies: {},
            headers: {},
            params: {},
            query: {},
            userId: 'user-123'
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    test('getAllHabits should call getUserHabits and return list of habits', async () => {
        req.query = { active: 'true' };
        mockHabitService.getUserHabits.mockResolvedValue([{ id: 'habit-1' }]);

        await habitController.getAllHabits(req, res, next);

        expect(mockHabitService.getUserHabits).toHaveBeenCalledWith('user-123', { active: 'true' });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, habits: [{ id: 'habit-1' }] });
    });

    test('getHabitById should retrieve habit by ID', async () => {
        req.params.id = 'habit-1';
        mockHabitService.getHabitById.mockResolvedValue({ id: 'habit-1' });

        await habitController.getHabitById(req, res, next);

        expect(mockHabitService.getHabitById).toHaveBeenCalledWith('habit-1', 'user-123');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, habit: { id: 'habit-1' } });
    });

    test('createHabit should call createHabit on service', async () => {
        req.body = { name: 'Gym' };
        mockHabitService.createHabit.mockResolvedValue({ id: 'habit-2', name: 'Gym' });

        await habitController.createHabit(req, res, next);

        expect(mockHabitService.createHabit).toHaveBeenCalledWith(req.body, 'user-123');
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test('updateHabit should update a habit', async () => {
        req.params.id = 'habit-1';
        req.body = { name: 'Running' };
        mockHabitService.updateHabit.mockResolvedValue({ id: 'habit-1', name: 'Running' });

        await habitController.updateHabit(req, res, next);

        expect(mockHabitService.updateHabit).toHaveBeenCalledWith('habit-1', 'user-123', req.body);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('deleteHabit should call deleteHabit on service', async () => {
        req.params.id = 'habit-1';
        mockHabitService.deleteHabit.mockResolvedValue();

        await habitController.deleteHabit(req, res, next);

        expect(mockHabitService.deleteHabit).toHaveBeenCalledWith('habit-1', 'user-123');
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('logMoodEnergy should log mood and energy', async () => {
        req.body = { mood: 5, energy: 4 };
        mockHabitService.logMoodEnergy.mockResolvedValue({ moodEnergyLog: { id: '1' }, created: true });

        await habitController.logMoodEnergy(req, res, next);

        expect(mockHabitService.logMoodEnergy).toHaveBeenCalledWith('user-123', req.body);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Mood and energy logged successfully'
        }));
    });

    test('logHabitCompletion should log completion', async () => {
        req.params.id = 'habit-1';
        req.body = { status: 'COMPLETED' };
        mockHabitService.logHabitCompletion.mockResolvedValue({ habitLog: { id: '1' }, created: true });

        await habitController.logHabitCompletion(req, res, next);

        expect(mockHabitService.logHabitCompletion).toHaveBeenCalledWith('habit-1', 'user-123', req.body);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('cancelCompletion should call cancelCompletion on service', async () => {
        req.params.id = 'habit-1';
        req.body = { cancelledReason: 'change of mind' };
        mockHabitService.cancelCompletion.mockResolvedValue({ id: '1', status: 'CANCELLED' });

        await habitController.cancelCompletion(req, res, next);

        expect(mockHabitService.cancelCompletion).toHaveBeenCalledWith('habit-1', 'user-123', req.body);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('getStats should call getHabitStats', async () => {
        req.params.id = 'habit-1';
        req.query.day = '30';
        mockHabitService.getHabitStats.mockResolvedValue({ totalCompletions: 5 });

        await habitController.getStats(req, res, next);

        expect(mockHabitService.getHabitStats).toHaveBeenCalledWith('habit-1', 'user-123', '30');
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('getHeatmap should call getHabitHeatmap and return heatmap data', async () => {
        req.params.id = 'habit-1';
        req.query.day = '90';
        mockHabitService.getHabitHeatmap.mockResolvedValue({ heatmapData: [] });

        await habitController.getHeatmap(req, res, next);

        expect(mockHabitService.getHabitHeatmap).toHaveBeenCalledWith('habit-1', 'user-123', '90');
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('getTargetChart should call getTargetChart', async () => {
        req.params.id = 'habit-1';
        mockHabitService.getTargetChart.mockResolvedValue({ result: {}, unit: 'hours' });

        await habitController.getTargetChart(req, res, next);

        expect(mockHabitService.getTargetChart).toHaveBeenCalledWith('habit-1', 'user-123');
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('getScoreChart should call getScoreChart', async () => {
        req.params.id = 'habit-1';
        req.query.period = 'month';
        mockHabitService.getScoreChart.mockResolvedValue([]);

        await habitController.getScoreChart(req, res, next);

        expect(mockHabitService.getScoreChart).toHaveBeenCalledWith('habit-1', 'user-123', 'month');
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('getHistoryChart should call getHistoryChart', async () => {
        req.params.id = 'habit-1';
        req.query.period = 'day';
        mockHabitService.getHistoryChart.mockResolvedValue([]);

        await habitController.getHistoryChart(req, res, next);

        expect(mockHabitService.getHistoryChart).toHaveBeenCalledWith('habit-1', 'user-123', 'day');
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('getCalendarChart should call getCalendarChart', async () => {
        req.params.id = 'habit-1';
        req.query.months = '3';
        mockHabitService.getCalendarChart.mockResolvedValue({ heatmapData: [], targetValue: 1 });

        await habitController.getCalendarChart(req, res, next);

        expect(mockHabitService.getCalendarChart).toHaveBeenCalledWith('habit-1', 'user-123', 3);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test('getFrequencyChart should call getFrequencyChart', async () => {
        req.params.id = 'habit-1';
        mockHabitService.getFrequencyChart.mockResolvedValue([]);

        await habitController.getFrequencyChart(req, res, next);

        expect(mockHabitService.getFrequencyChart).toHaveBeenCalledWith('habit-1', 'user-123');
        expect(res.status).toHaveBeenCalledWith(200);
    });
});
