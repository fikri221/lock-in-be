const { format, subDays } = require("date-fns");
const { Habit, HabitLog } = require("../models");
const { Op } = require("sequelize");


const habitController = {
    // Get all habits for a specific user
    getAllHabits: async (req, res, next) => {
        try {
            const { active } = req.query;

            const where = { userId: req.userId };
            if (active !== undefined) {
                where.isActive = active === 'true';
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
                order: [['createdAt', 'DESC']]
            });
            res.status(200).json({ habits });
        } catch (error) {
            next(error);
        }
    },

    // Get a specific habit by ID
    getHabitById: async (req, res, next) => {
        try {
            const { id } = req.params;
            const habit = await Habit.findOne({
                where: { id, userId: req.userId },
                include: [{
                    model: HabitLog,
                    as: 'logs',
                    order: [['logDate', 'DESC']],
                    limit: 10
                }],
            });
            if (!habit) {
                return res.status(404).json({ error: "Habit not found" });
            }
            res.status(200).json({ habit });
        } catch (error) {
            next(error);
        }
    },

    // Create a new habit
    createHabit: async (req, res, next) => {
        try {
            const habitData = { ...req.body, userId: req.userId };
            const newHabit = await Habit.create(habitData);

            res.status(201).json({ message: "Habit created successfully", habit: newHabit });
        } catch (error) {
            next(error);
        }
    },

    // Update an existing habit
    updateHabit: async (req, res, next) => {
        try {
            const { id } = req.params;
            const habit = await Habit.findOne({ where: { id, userId: req.userId } });

            if (!habit) {
                return res.status(404).json({ error: "Habit not found" });
            }

            await habit.update(req.body);
            res.status(200).json({ message: "Habit updated successfully", habit });
        } catch (error) {
            next(error);
        }
    },

    // Delete a habit (soft delete)
    deleteHabit: async (req, res, next) => {
        try {
            const { id } = req.params;
            const habit = await Habit.findOne({ where: { id, userId: req.userId } });

            if (!habit) {
                return res.status(404).json({ error: "Habit not found" });
            }

            await habit.update({ isActive: false });
            res.status(200).json({ message: "Habit deleted successfully" });
        } catch (error) {
            next(error);
        }
    },

    // Log a habit completion
    logHabitCompletion: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { status, notes, mood, energy, weather } = req.body;

            // Verify habit log belong to the user
            const habit = await Habit.findOne({ where: { id, userId: req.userId } });

            if (!habit) {
                return res.status(404).json({ error: "Habit not found" });
            }

            const today = format(new Date(), 'yyyy-MM-dd');

            // Upsert (update if exist and insert if dont exist) habit log for today
            const [habitLog, created] = await HabitLog.upsert({
                habitId: id,
                userId: req.userId,
                logDate: today,
                status,
                completedAt: status === 'completed' ? new Date() : null,
                notes,
                mood,
                energy,
                weather
            }, { returning: true });

            // Update habit stats if completed
            if (status === 'completed') {
                await habit.increment('totalCompletions');

                // Calculate streak
                const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
                const yesterdayLog = await HabitLog.findOne({
                    where: {
                        habitId: id,
                        logDate: yesterday,
                        status: 'completed'
                    }
                });

                if (yesterdayLog) {
                    await habit.increment('currentStreak');
                    await habit.reload(); // ambil nilai terbaru dari DB
                    if (habit.currentStreak > habit.longestStreak) {
                        await habit.update({ longestStreak: habit.currentStreak }, { fields: ['longestStreak'] });
                    }
                }
            }

            res.status(200).json({ message: created ? "Habit logged successfully" : "Habit log updated successfully", habitLog });
        } catch (error) {
            next(error);
        }
    },

    // Get habit statistics
    getStats: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { day = 30 } = req.query;

            // Verify habit belong to the user
            const habit = await Habit.findOne({ where: { id, userId: req.userId } });

            if (!habit) {
                return res.status(404).json({ error: "Habit not found" });
            }

            const startDate = format(subDays(new Date(), parseInt(day)), 'yyyy-MM-dd');
            const logs = await HabitLog.findAll({
                where: {
                    habitId: id,
                    logDate: {
                        [Op.gte]: startDate
                    }
                },
                order: [['logDate', 'ASC']]
            });

            const skippedCount = logs.filter(log => log.status === 'skipped').length;
            const completedCount = logs.filter(log => log.status === 'completed').length;
            const completionRate = Math.round((completedCount / logs.length) * 100) || 0;

            res.status(200).json({
                habit: {
                    id: habit.id,
                    name: habit.name,
                    currentStreak: habit.currentStreak,
                    longestStreak: habit.longestStreak,
                    totalCompletions: habit.totalCompletions
                },
                period: {
                    days: parseInt(day),
                    startDate,
                    endDate: format(new Date(), 'yyyy-MM-dd')
                },
                stats: {
                    totalLogs: logs.length,
                    skippedCount,
                    completedCount,
                    completionRate
                },
                logs
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = habitController;