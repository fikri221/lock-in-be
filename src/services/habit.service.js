import { Habit, HabitLog } from '../models/index.js';
import { sequelize } from '../config/database.js';
import {
    format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek,
    startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear,
    eachDayOfInterval, differenceInCalendarDays, getDate, getDay, getMonth,
    parseISO, subMonths, subYears, addDays, addMonths, addYears
} from 'date-fns';
import { Op } from 'sequelize';
import MoodEnergyLog from '../models/MoodEnergyLog.js';

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

        // Determine log filter
        // Default: today only (backward compatibility)
        let logWhere = {
            logDate: format(new Date(), 'yyyy-MM-dd')
        };

        if (filters.startDate && filters.endDate) {
            // Date range
            logWhere = {
                logDate: {
                    [Op.between]: [filters.startDate, filters.endDate]
                }
            };
        } else if (filters.date) {
            // Specific single date
            logWhere = {
                logDate: filters.date
            };
        }

        const habits = await Habit.findAll({
            where,
            include: [{
                model: HabitLog,
                as: 'logs',
                where: logWhere,
                required: false, // Left join: return habit even if no logs found
                order: [['logDate', 'DESC']],
                limit: 10
            }],
            order: [['createdAt', 'DESC']]
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
                order: [['logDate', 'DESC']],
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
            const habit = await this._getHabit(habitId, userId, t);

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
            const habit = await this._getHabit(habitId, userId, t);

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
     * @param {Object} logData - Log data (status, weather etc.)
     * @returns {Promise<Object>} { habitLog, created }
     */
    async logHabitCompletion(habitId, userId, logData) {
        const t = await sequelize.transaction();

        try {
            // Verify habit ownership
            const habit = await this._getHabit(habitId, userId, t);

            // Use UTC-safe date handling or accept date from client in future
            // For now, consistent server date
            const { status, weather, actualValue, logDate = format(new Date(), 'yyyy-MM-dd') } = logData;

            // Check for existing log to prevent double stats increment
            const existingLog = await HabitLog.findOne({
                where: { habitId, logDate }
            });

            const wasCompleted = existingLog && existingLog.status === 'COMPLETED';
            const isNowCompleted = status === 'COMPLETED';

            // Upsert habit log
            const [habitLog, created] = await HabitLog.upsert({
                habitId,
                userId,
                logDate,
                status,
                completedAt: isNowCompleted ? (existingLog?.completedAt || new Date()) : null,
                weather,
                actualValue
            }, { returning: true, transaction: t });

            // Update stats intelligently
            if (isNowCompleted && !wasCompleted) {
                // Changing from Not Completed -> Completed: Increment
                await this.updateHabitStats(habit, t, logDate);
            } else if (!isNowCompleted && wasCompleted) {
                // Changing from Completed -> Not Completed: Decrement
                await habit.decrement('totalCompletions', { transaction: t });
                await habit.decrement('currentStreak', { transaction: t });
            }

            await t.commit();

            return { habitLog, created };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Mood and energy level log
     * @param {string} userId - User ID
     * @param {Object} logData - Log data (mood, energy, notes etc.)
     * @returns {Promise<Object>} { moodEnergyLog, created }
     */
    async logMoodEnergy(userId, logData) {
        const t = await sequelize.transaction();

        try {
            // Use UTC-safe date handling or accept date from client in future
            // For now, consistent server date
            const today = format(new Date(), 'yyyy-MM-dd');
            const { mood, energy, notes } = logData;

            // Upsert habit log
            const [moodEnergyLog, created] = await MoodEnergyLog.upsert({
                userId,
                logDate: today,
                mood,
                energy,
                notes
            }, { returning: true, transaction: t });

            await t.commit();

            return { moodEnergyLog, created };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Cancel a habit completion
     * @param {string} habitId - Habit ID
     * @param {string} userId - User ID
     * @param {Object} logData - Log data (status, cancelledAt, cancelledReason)
     * @returns {Promise<Object>} Cancelled habit log
     */
    async cancelCompletion(habitId, userId, logData) {
        const t = await sequelize.transaction();

        try {
            const habit = await this._getHabit(habitId, userId, t);

            // Use UTC-safe date handling or accept date from client in future
            // For now, consistent server date
            const { cancelledReason, logDate = format(new Date(), 'yyyy-MM-dd') } = logData;

            // Find today's log
            const log = await HabitLog.findOne({
                where: { habitId, logDate }
            });

            if (!log) {
                const error = new Error(`No completed log found for date: ${logDate}`);
                error.statusCode = 404;
                throw error;
            }

            const wasCompleted = log.status === 'COMPLETED';

            await log.update({ status: 'CANCELLED', cancelledAt: new Date(), cancelledReason: cancelledReason || "user cancelled" }, { transaction: t });

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
     * @param {string} logDate - Date of the log being updated
     */
    async updateHabitStats(habit, transaction, logDate = null) {
        // Increment total completions
        await habit.increment('totalCompletions', { transaction });
        // Continue streak
        await habit.increment('currentStreak', { transaction });
        await habit.reload({ transaction });

        // Calculate streak
        const baseDate = logDate ? new Date(logDate) : new Date();
        const yesterday = format(subDays(baseDate, 1), 'yyyy-MM-dd');
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
        const habit = await this._getHabit(habitId, userId);

        const startDate = format(subDays(new Date(), parseInt(days)), 'yyyy-MM-dd');
        const endDate = format(new Date(), 'yyyy-MM-dd');

        const logs = await HabitLog.findAll({
            where: {
                habitId,
                logDate: {
                    [Op.between]: [startDate, endDate]
                }
            },
            order: [['logDate', 'ASC']]
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
                endDate
            },
            stats,
            logs
        };
    }

    /**
     * Get heatmap data for a period
     * @param {string} habitId - Habit ID
     * @param {string} userId - User ID
     * @param {number} days - Number of days to look back (default: 90)
     * @returns {Promise<Object>} Heatmap data
     */
    async getHabitHeatmap(habit, days = 90) {
        // const habit = await this._getHabit(habitId, userId);

        const today = format(new Date(), 'yyyy-MM-dd');
        const startDate = format(subDays(today, parseInt(days) - 1), 'yyyy-MM-dd');
        // const endDate = format(today, 'yyyy-MM-dd');

        const logs = await HabitLog.findAll({
            where: {
                habitId: habit.id,
                logDate: {
                    [Op.gte]: startDate
                }
            },
            order: [['logDate', 'ASC']]
        });

        // Create map of date -> status
        const heatmapData = [];
        logs.forEach(log => {
            heatmapData.push({ date: log.logDate, status: log.status, actualValue: Number(log.actualValue) });
        });

        return {
            // days: parseInt(days),
            // startDate,
            // endDate,
            heatmapData,
            targetValue: habit.targetValue
        };
    }

    /**
     * Get target vs actual chart data
     * @param {string} habitId 
     * @param {string} userId 
     * @returns {Promise<Object>}
     */
    async getTargetChart(habitId, userId) {
        const habit = await this._getHabit(habitId, userId);
        const today = new Date();

        const periods = {
            today: { start: startOfDay(today), end: endOfDay(today), days: 1 },
            week: { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }), days: 7 },
            month: { start: startOfMonth(today), end: endOfMonth(today), days: getDate(endOfMonth(today)) },
            quarter: { start: startOfQuarter(today), end: endOfQuarter(today), days: differenceInCalendarDays(endOfQuarter(today), startOfQuarter(today)) + 1 },
            year: { start: startOfYear(today), end: endOfYear(today), days: differenceInCalendarDays(endOfYear(today), startOfYear(today)) + 1 }
        };

        const result = {};
        let unit = '';

        for (const [key, period] of Object.entries(periods)) {
            const logs = await HabitLog.findAll({
                where: {
                    habit_id: habit.id,
                    log_date: {
                        [Op.between]: [format(period.start, 'yyyy-MM-dd'), format(period.end, 'yyyy-MM-dd')]
                    },
                    status: 'COMPLETED'
                }
            });

            // Calculate Target
            let target = 0;
            const targetValuePerDay = habit.habitType === 'measurable' ? parseFloat(habit.targetValue) || 1 : 1;

            if (habit.frequency === 'DAILY') {
                if (habit.targetDays && habit.targetDays.length > 0) {
                    const daysInInterval = eachDayOfInterval({ start: period.start, end: period.end });
                    const targetDaysSet = new Set(habit.targetDays.map(d => parseInt(d))); // targetDays are strings '1'..'7' 

                    let matchCount = 0;
                    for (const day of daysInInterval) {
                        // getDay(): 0=Sun, 1=Mon...6=Sat
                        // If habit.targetDays uses 1=Mon...7=Sun:
                        let dayNum = getDay(day);
                        if (dayNum === 0) dayNum = 7; // Convert Sun 0 to 7

                        if (targetDaysSet.has(dayNum)) {
                            matchCount++;
                        }
                    }
                    target = matchCount * targetValuePerDay;
                } else {
                    target = period.days * targetValuePerDay;
                }
            } else if (habit.frequency === 'WEEKLY') {
                if (habit.targetDays !== null) {
                    // Target is the number of targetCount per week
                    // habit.targetCount * targetValuePerDay = target per week
                    // period.days / 7 = number of weeks
                    // (period.days / 7) * (habit.targetCount * targetValuePerDay) = target
                    target = (habit.targetCount * targetValuePerDay) * (period.days / 7);
                } else {
                    target = period.days * targetValuePerDay;
                }
            }

            // TODO: Add support for monthly and yearly (WIP)
            // else if (habit.frequency === 'MONTHLY') {
            //     if (habit.targetDays !== null) {
            //         target = habit.targetDays.length * targetValuePerDay;
            //     } else {
            //         target = period.months * targetValuePerDay;
            //     }
            // } else if (habit.frequency === 'YEARLY') {
            //     if (habit.targetDays !== null) {
            //         target = habit.targetDays.length * targetValuePerDay;
            //     } else {
            //         target = period.years * targetValuePerDay;
            //     }
            // }

            // Calculate Actual
            let actual = 0;
            if (habit.habitType === 'measurable') {
                actual = logs.reduce((sum, log) => sum + Number(log.actualValue || 0), 0);
            } else {
                actual = logs.length; // Count of COMPLETED
            }

            result[key] = {
                actual,
                target: Math.round(target)
            };

            if (habit.habitType === 'measurable') {
                unit = habit.targetUnit;
            }
        }

        return { result, unit };
    }

    /**
     * Get score chart data (percentage over time)
     * @param {string} habitId
     * @param {string} userId
     * @param {string} period 'day' | 'month' | 'year'
     */
    async getScoreChart(habitId, userId, period = 'day') {
        const habit = await this._getHabit(habitId, userId);
        const endDate = new Date();
        let startDate;
        let interval;

        switch (period) {
            case 'year':
                startDate = subYears(endDate, 5); // Last 5 years
                interval = 'year';
                break;
            case 'month':
                startDate = subMonths(endDate, 11); // Last 12 months
                interval = 'month';
                break;
            case 'day':
            default:
                startDate = subDays(endDate, 29); // Last 30 days
                interval = 'day';
        }

        const logs = await HabitLog.findAll({
            where: {
                habit_id: habit.id,
                log_date: {
                    [Op.between]: [format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')]
                },
                status: 'COMPLETED'
            }
        });

        // Group logs by date/period
        const groupedLogs = {};
        logs.forEach(log => {
            let key;
            const logDateVal = parseISO(log.logDate);
            if (interval === 'year') key = format(logDateVal, 'yyyy');
            else if (interval === 'month') key = format(logDateVal, 'yyyy-MM');
            else key = log.logDate;

            if (!groupedLogs[key]) groupedLogs[key] = [];
            groupedLogs[key].push(log);
        });

        // Generate all points in interval
        const result = [];
        let current = startDate;
        const targetValue = habit.habitType === 'measurable' ? (parseFloat(habit.targetValue) || 1) : 1;

        while (current <= endDate) {
            let key;
            let label;
            if (interval === 'year') {
                key = format(current, 'yyyy');
                label = format(current, 'yyyy');
            } else if (interval === 'month') {
                key = format(current, 'yyyy-MM');
                label = format(current, 'MMM');
            } else {
                key = format(current, 'yyyy-MM-dd');
                label = format(current, 'd'); // Day of month 1-31
            }

            const periodLogs = groupedLogs[key] || [];
            let score = 0;

            if (habit.habitType === 'measurable') {
                const totalActual = periodLogs.reduce((sum, log) => sum + Number(log.actualValue || 0), 0);

                let periodTarget = targetValue;
                if (interval !== 'day') {
                    // Approximate target for larger periods
                    // This is simplified. Real logic requires counting scheduled days in period.
                    const daysInPeriod = interval === 'year' ? 365 : (interval === 'month' ? 30 : 1);
                    periodTarget = targetValue * daysInPeriod;
                }

                score = Math.min(100, Math.round((totalActual / periodTarget) * 100));
            } else {
                // Boolean
                // Score = (Completed Count / Scheduled Count) * 100
                const completedCount = periodLogs.length;
                let scheduledCount = 1;
                if (interval === 'day') {
                    scheduledCount = 1;
                } else {
                    scheduledCount = interval === 'month' ? 30 : 365; // Approx
                }

                score = Math.round((completedCount / scheduledCount) * 100);
            }

            result.push({
                date: format(current, 'yyyy-MM-dd'),
                label,
                score
            });

            // Increment
            if (interval === 'year') current = addYears(current, 1);
            else if (interval === 'month') current = addMonths(current, 1);
            else current = addDays(current, 1);
        }

        return result;
    }

    /**
     * Get history chart data (actual values)
     * @param {string} habitId
     * @param {string} userId
     * @param {string} period 'day' | 'month' | 'year'
     */
    async getHistoryChart(habitId, userId, period = 'day') {
        const habit = await this._getHabit(habitId, userId);
        const endDate = new Date();
        let startDate;
        let interval;

        switch (period) {
            case 'year':
                startDate = subYears(endDate, 5);
                interval = 'year';
                break;
            case 'month':
                startDate = subMonths(endDate, 11);
                interval = 'month';
                break;
            case 'day':
            default:
                startDate = subDays(endDate, 29); // Last 30 days
                interval = 'day';
        }

        const logs = await HabitLog.findAll({
            where: {
                habit_id: habit.id,
                log_date: {
                    [Op.between]: [format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')]
                },
                status: 'COMPLETED'
            }
        });

        const groupedLogs = {};
        logs.forEach(log => {
            let key;
            const logDateVal = parseISO(log.logDate);
            if (interval === 'year') key = format(logDateVal, 'yyyy');
            else if (interval === 'month') key = format(logDateVal, 'yyyy-MM');
            else key = log.logDate;

            if (!groupedLogs[key]) groupedLogs[key] = [];
            groupedLogs[key].push(log);
        });

        const result = [];
        let current = startDate;

        while (current <= endDate) {
            let key;
            if (interval === 'year') key = format(current, 'yyyy');
            else if (interval === 'month') key = format(current, 'yyyy-MM');
            else key = format(current, 'yyyy-MM-dd');

            const periodLogs = groupedLogs[key] || [];

            let value = 0;

            if (habit.habitType === 'measurable') {
                value = periodLogs.reduce((sum, log) => sum + Number(log.actualValue || 0), 0);
            } else {
                value = periodLogs.length; // Count for boolean
            }

            result.push({
                date: format(current, 'yyyy-MM-dd'),
                value
            });

            if (interval === 'year') current = addYears(current, 1);
            else if (interval === 'month') current = addMonths(current, 1);
            else current = addDays(current, 1);
        }

        return result;
    }

    /**
     * Get calendar heatmap data
     * @param {string} habitId
     * @param {string} userId
     * @param {number} months
     */
    async getCalendarChart(habitId, userId, months = 3) {
        // Use 30 days per month approx
        const days = months * 30;
        const habit = await this._getHabit(habitId, userId);
        const heatmapData = await this.getHabitHeatmap(habit, days);

        // Format compatible with frontend needs? 
        // getHabitHeatmap returns { days, startDate, endDate, heatmapData: [{ date, count, value }] }
        // We might need to transform it if needed, but for now passing it through.
        // Actually, let's look at getHabitHeatmap output form again.
        // It returns object with metadata.
        // If frontend expects array, we should return array. 
        // Implementation plan said: "Returns array of { date, intensity }"

        // Existing getHabitHeatmap returns:
        // heatmapData: array of objects.
        // Let's just return that array or the whole object?
        // Let's return the array from heatmapData property.

        return heatmapData || [];
    }

    /**
     * Get frequency chart data
     * @param {string} habitId
     * @param {string} userId
     */
    async getFrequencyChart(habitId, userId) {
        const habit = await this._getHabit(habitId, userId);
        const endDate = new Date();
        const startDate = subYears(endDate, 1); // Last 1 year

        const logs = await HabitLog.findAll({
            where: {
                habit_id: habit.id,
                log_date: {
                    [Op.between]: [format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')]
                },
                status: 'COMPLETED'
            }
        });

        // Group by Month and DayOfWeek
        // x-axis: Month (Jan..Dec)
        // y-axis: Day (Sun..Sat)
        // value: size of bubble

        const frequencyMap = {}; // Key: "MonthIndex-DayIndex" -> value

        logs.forEach(log => {
            const date = parseISO(log.logDate);
            const month = getMonth(date); // 0-11
            const dayOfWeek = getDay(date); // 0 (Sun) - 6 (Sat)
            const key = `${month}-${dayOfWeek}`;

            if (!frequencyMap[key]) frequencyMap[key] = 0;

            if (habit.habitType === 'measurable') {
                frequencyMap[key] += Number(log.actualValue || 0);
            } else {
                frequencyMap[key] += 1;
            }
        });

        const result = [];
        // Helper for day names 
        // 0=Sun

        // We iterate through logs or fill all slots? 
        // Usually frequency chart shows where activity happened.
        // Returning only non-zero values is efficient.

        for (const [key, value] of Object.entries(frequencyMap)) {
            const [month, day] = key.split('-');
            result.push({
                month: parseInt(month),
                day: parseInt(day),
                value
            });
        }

        return result;
    }

    /**
     * Calculate statistics from logs
     * @private
     * @param {Array} logs - Array of habit logs
     * @returns {Object} Statistics
     */
    calculateStats(logs) {
        const totalLogs = logs.length;
        const skippedLogs = logs.filter(log => log.status === 'SKIPPED');
        const completedLogs = logs.filter(log => log.status === 'COMPLETED');
        const completionRate = totalLogs > 0
            ? Math.round((completedLogs.length / totalLogs) * 100)
            : 0;

        // Calculate average mood and energy
        // Next phase

        // Find best day of week
        const dayStats = {};
        completedLogs.forEach(log => {
            // Get day of week (0 = Sunday, 1 = Monday, ...)
            const day = new Date(log.logDate).getDay();
            const completedAt = new Date(log.logDate).getTime();
            // Put day in dayStats
            if (!dayStats[day]) {
                dayStats[day] = {
                    count: 1,
                    lastCompletedAt: completedAt
                };
            } else {
                dayStats[day].count += 1;
                dayStats[day].lastCompletedAt = Math.max(dayStats[day].lastCompletedAt, completedAt);
            }
        });

        // Find best day of week
        // Sort by count and then by lastCompletedAt
        const bestDay = Object.keys(dayStats).length > 0
            ? Object.entries(dayStats).sort((a, b) => b[1].count - a[1].count || b[1].lastCompletedAt - a[1].lastCompletedAt)[0]
            : null;

        const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const bestDayName = bestDay ? DAY_NAMES[Number(bestDay[0])] : null;
        const bestDayCount = bestDay ? bestDay[1].count : 0;

        return {
            totalLogs,
            skippedCount: skippedLogs.length,
            completedCount: completedLogs.length,
            completionRate,
            bestDay: bestDayName,
            bestDayCount
        };
    }

    /**
     * Helper to get habit and verify ownership
     * @private
     * @param {string} habitId
     * @param {string} userId
     * @param {Object} [transaction]
     * @returns {Promise<Object>}
     */
    async _getHabit(habitId, userId, transaction = null) {
        const options = {
            where: { id: habitId, userId }
        };
        if (transaction) options.transaction = transaction;

        const habit = await Habit.findOne(options);

        if (!habit) {
            const error = new Error('Habit not found');
            error.statusCode = 404;
            throw error;
        }
        return habit;
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
