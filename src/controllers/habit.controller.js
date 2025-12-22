import habitService from '../services/habit.service.js';

/**
 * Habit Controller - Handles HTTP requests/responses
 * All business logic is delegated to the service layer
 */
const habitController = {
    /**
     * Get all habits for the authenticated user
     * GET /api/habits?active=true
     */
    getAllHabits: async (req, res, next) => {
        try {
            const habits = await habitService.getUserHabits(req.userId, req.query);

            res.status(200).json({
                success: true,
                habits
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get a specific habit by ID
     * GET /api/habits/:id
     */
    getHabitById: async (req, res, next) => {
        try {
            const habit = await habitService.getHabitById(req.params.id, req.userId);

            res.status(200).json({
                success: true,
                habit
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Create a new habit
     * POST /api/habits
     */
    createHabit: async (req, res, next) => {
        try {
            const habit = await habitService.createHabit(req.body, req.userId);

            res.status(201).json({
                success: true,
                message: "Habit created successfully",
                habit
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Update an existing habit
     * PUT /api/habits/:id
     */
    updateHabit: async (req, res, next) => {
        try {
            const habit = await habitService.updateHabit(
                req.params.id,
                req.userId,
                req.body
            );

            res.status(200).json({
                success: true,
                message: "Habit updated successfully",
                habit
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Delete a habit (soft delete)
     * DELETE /api/habits/:id
     */
    deleteHabit: async (req, res, next) => {
        try {
            await habitService.deleteHabit(req.params.id, req.userId);

            res.status(200).json({
                success: true,
                message: "Habit deleted successfully"
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Log a habit completion
     * POST /api/habits/:id/log
     */
    logHabitCompletion: async (req, res, next) => {
        try {
            const { habitLog, created } = await habitService.logHabitCompletion(
                req.params.id,
                req.userId,
                req.body
            );

            res.status(200).json({
                success: true,
                message: created
                    ? "Habit logged successfully"
                    : "Habit log updated successfully",
                habitLog
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Cancel a habit completion
     * POST /api/habits/:id/cancel
     */
    cancelCompletion: async (req, res, next) => {
        try {
            const habitLog = await habitService.cancelCompletion(
                req.params.id,
                req.userId,
                req.body
            );

            res.status(200).json({
                success: true,
                message: "Habit log cancelled successfully",
                habitLog
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get habit statistics
     * GET /api/habits/:id/stats?day=30
     */
    getStats: async (req, res, next) => {
        try {
            const stats = await habitService.getHabitStats(
                req.params.id,
                req.userId,
                req.query.day
            );

            res.status(200).json({
                success: true,
                stats
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get habit heatmap
     * GET /api/habits/:id/heatmap?day=90
     */
    getHeatmap: async (req, res, next) => {
        try {
            const heatmap = await habitService.getHabitHeatmap(
                req.params.id,
                req.userId,
                req.query.day
            );

            res.status(200).json({
                success: true,
                heatmap
            });
        } catch (error) {
            next(error);
        }
    }
};

export default habitController;
