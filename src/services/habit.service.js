import { Habit, HabitLog } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { format, subDays } from 'date-fns';
import { Op } from 'sequelize';

/**
 * Habit Service - Contains all business logic for habit operations
 * This separates business logic from HTTP concerns (controllers)
 */
class HabitService {
    /**
     * Create a new habit for a user
     * @param {Object} habitData - Habit data from request
     * @param {string} userId - User ID from auth middleware
     * @returns {Promise<Object>} Created habit
     */
    async createHabit(habitData, userId) {
        const t = await sequelize.transaction();

        try {
            // Business validation
            if (habitData.scheduledTime && !this.isValidTime(habitData.scheduledTime)) {
                throw new Error('Invalid scheduled time format. Use HH:MM format.');
            }

            // Create habit with user association
            const habit = await Habit.create(
                { ...habitData, userId },
                { transaction: t }
            );

            await t.commit();
            return habit;
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Get all habits for a user with optional filtering
     * @param {string} userId - User ID
     * @param {Object} filters - Filter options (active, etc.)
     * @returns {Promise<Array>} List of habits
     */
    async getUserHabits(userId, filters = {}) {
        const where = { userId };

        if (filters.active !== undefined) {
            where.isActive = filters.active === 'true';
        }

        const habits = await Habit.findAll({
            where,
            include: [{
                model: HabitLog,
                as: 'logs',
                where: {
                    logDate: format(new Date(), 'yyyy-MM-dd')
                },
                required: false
            }],
            order: [['created_at', 'DESC']]
        });

        return habits;
    }

    /**
     * Get a specific habit by ID
     * @param {string} habitId - Habit ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Habit with logs
     */
    async getHabitById(habitId, userId) {
        const habit = await Habit.findOne({
            where: { id: habitId, userId },
            include: [{
                model: HabitLog,
                as: 'logs',
                order: [['log_date', 'DESC']],
                limit: 10
            }],
        });

        if (!habit) {
            const error = new Error('Habit not found');
            error.statusCode = 404;
            throw error;
        }

        return habit;
    }

    /**
     * Update an existing habit
     * @param {string} habitId - Habit ID
     * @param {string} userId - User ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated habit
     */
    async updateHabit(habitId, userId, updateData) {
        const t = await sequelize.transaction();

        try {
            const habit = await Habit.findOne({
                where: { id: habitId, userId }
            });

            if (!habit) {
                const error = new Error('Habit not found');
                error.statusCode = 404;
                throw error;
            }

            // Business validation
            if (updateData.scheduledTime && !this.isValidTime(updateData.scheduledTime)) {
                throw new Error('Invalid scheduled time format. Use HH:MM format.');
            }

            await habit.update(updateData, { transaction: t });
            await t.commit();

            return habit;
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Delete a habit (soft delete)
     * @param {string} habitId - Habit ID
     * @param {string} userId - User ID
     * @returns {Promise<void>}
     */
    async deleteHabit(habitId, userId) {
        const t = await sequelize.transaction();

        try {
            const habit = await Habit.findOne({
                where: { id: habitId, userId }
            });

            if (!habit) {
                const error = new Error('Habit not found');
                error.statusCode = 404;
                throw error;
            }

            await habit.update({ isActive: false }, { transaction: t });
            await t.commit();
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Log habit completion with streak calculation
     * @param {string} habitId - Habit ID
     * @param {string} userId - User ID
     * @param {Object} logData - Log data (status, notes, mood, etc.)
     * @returns {Promise<Object>} { habitLog, created }
     */
    async logHabitCompletion(habitId, userId, logData) {
        const t = await sequelize.transaction();

        try {
            // Verify habit ownership
            const habit = await Habit.findOne({
                where: { id: habitId, userId }
            });

            if (!habit) {
                const error = new Error('Habit not found');
                error.statusCode = 404;
                throw error;
            }

            const today = format(new Date(), 'yyyy-MM-dd');
            const { status, notes, mood, energy, weather } = logData;

            // Upsert habit log
            const [habitLog, created] = await HabitLog.upsert({
                habitId,
                userId,
                logDate: today,
                status,
                completedAt: status === 'COMPLETED' ? new Date() : null,
                notes,
                mood,
                energy,
                weather
            }, { returning: true, transaction: t });

            // Update stats if completed
            if (status === 'COMPLETED') {
                await this.updateHabitStats(habit, t);
            }

            await t.commit();

            return { habitLog, created };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Cancel a habit completion
     * @param {string} habitId - Habit ID
     * @param {string} userId - User ID
     * @param {Object} reqBody - Request body
     * @returns {Promise<Object>} Cancelled habit log
     */
    async cancelCompletion(habitId, userId, reqBody) {
        const t = await sequelize.transaction();

        try {
            const habit = await Habit.findOne({
                where: { id: habitId, userId }
            });

            if (!habit) {
                const error = new Error('Habit not found');
                error.statusCode = 404;
                throw error;
            }

            const today = format(new Date(), 'yyyy-MM-dd');

            // Find today's log
            const log = await HabitLog.findOne({
                where: { habitId, logDate: today, status: ['COMPLETED', 'SKIPPED'] }
            });

            if (!log) {
                const error = new Error('No completed log found for today');
                error.statusCode = 404;
                throw error;
            }

            const wasCompleted = log.status === 'COMPLETED';

            await log.update({ status: 'CANCELLED', cancelledAt: new Date(), cancelledReason: reqBody || "user cancelled" }, { transaction: t });

            // Update habit stats only if it was previously completed
            if (wasCompleted) {
                await habit.decrement('totalCompletions', { transaction: t });
                await habit.decrement('currentStreak', { transaction: t });
            }
            await t.commit();

            return log;
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Calculate and update habit statistics
     * @private
     * @param {Object} habit - Habit instance
     * @param {Object} transaction - Sequelize transaction
     */
    async updateHabitStats(habit, transaction) {
        // Increment total completions
        await habit.increment('totalCompletions', { transaction });
        // Continue streak
        await habit.increment('currentStreak', { transaction });
        await habit.reload({ transaction });

        // Calculate streak
        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
        const yesterdayLog = await HabitLog.findOne({
            where: {
                habitId: habit.id,
                logDate: yesterday,
                status: 'COMPLETED'
            }
        });

        if (yesterdayLog) {
            // Update longest streak if needed
            if (habit.currentStreak > habit.longestStreak) {
                await habit.update(
                    { longestStreak: habit.currentStreak },
                    { transaction }
                );
            }
        } else {
            // Reset streak to 1 (today's completion)
            await habit.update({ currentStreak: 1 }, { transaction });
        }
    }

    /**
     * Get habit statistics for a period
     * @param {string} habitId - Habit ID
     * @param {string} userId - User ID
     * @param {number} days - Number of days to look back (default: 30)
     * @returns {Promise<Object>} Statistics object
     */
    async getHabitStats(habitId, userId, days = 30) {
        const habit = await Habit.findOne({
            where: { id: habitId, userId }
        });

        if (!habit) {
            const error = new Error('Habit not found');
            error.statusCode = 404;
            throw error;
        }

        const startDate = format(subDays(new Date(), parseInt(days)), 'yyyy-MM-dd');
        const logs = await HabitLog.findAll({
            where: {
                habitId,
                logDate: {
                    [Op.gte]: startDate
                }
            },
            order: [['log_date', 'ASC']]
        });

        // Calculate statistics
        const stats = this.calculateStats(logs);

        return {
            habit: {
                id: habit.id,
                name: habit.name,
                currentStreak: habit.currentStreak,
                longestStreak: habit.longestStreak,
                totalCompletions: habit.totalCompletions
            },
            period: {
                days: parseInt(days),
                startDate,
                endDate: format(new Date(), 'yyyy-MM-dd')
            },
            stats,
            logs
        };
    }

    /**
     * Calculate statistics from logs
     * @private
     * @param {Array} logs - Array of habit logs
     * @returns {Object} Statistics
     */
    calculateStats(logs) {
        const skippedCount = logs.filter(log => log.status === 'SKIPPED').length;
        const completedCount = logs.filter(log => log.status === 'COMPLETED').length;
        const completionRate = logs.length > 0
            ? Math.round((completedCount / logs.length) * 100)
            : 0;

        return {
            totalLogs: logs.length,
            skippedCount,
            completedCount,
            completionRate
        };
    }

    /**
     * Validate time format (HH:MM)
     * @private
     * @param {string} time - Time string
     * @returns {boolean} Is valid
     */
    isValidTime(time) {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
    }
}

// Export singleton instance
export default new HabitService();
