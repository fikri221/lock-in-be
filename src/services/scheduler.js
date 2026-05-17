/*
 * Notification Scheduler
 * Runs cron jobs to check and send scheduled notifications
 * - Daily summary: runs every minute, checks if user's reminderTime matches current time
 * - Per-habit reminder: runs every minute, checks habits with scheduledTime matching now
 */
import cron from 'node-cron';
import { User, Habit, HabitLog } from '../models/index.js';
import notificationService from './notification.service.js';
import { Op } from 'sequelize';

/**
 * Get current time in HH:MM format for a given timezone
 */
function getCurrentTimeInTimezone(timezone) {
    try {
        const formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
        return formatter.format(new Date());
    } catch {
        // Fallback to UTC if timezone is invalid
        const now = new Date();
        return `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
    }
}

/**
 * Get today's date string in YYYY-MM-DD format for a timezone
 */
function getTodayInTimezone(timezone) {
    try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        return formatter.format(new Date());
    } catch {
        return new Date().toISOString().split('T')[0];
    }
}

/**
 * Send daily summary reminders
 * Checks all users whose reminderTime matches the current minute in their timezone
 */
async function processDailyReminders() {
    try {
        const users = await User.findAll({
            where: {
                notificationEnabled: true,
                reminderTime: { [Op.ne]: null },
            }
        });

        for (const user of users) {
            const currentTime = getCurrentTimeInTimezone(user.timezone || 'Asia/Jakarta');

            // Compare HH:MM — reminderTime is stored as "HH:MM" or "HH:MM:SS"
            const userReminderTime = user.reminderTime?.substring(0, 5);

            if (currentTime === userReminderTime) {
                console.log(`⏰ Sending daily summary to ${user.email} at ${currentTime}`);
                try {
                    await notificationService.sendDailySummary(user.id);
                } catch (err) {
                    console.error(`Failed to send daily summary to ${user.email}:`, err.message);
                }
            }
        }
    } catch (error) {
        console.error('Error in daily reminder processor:', error);
    }
}

/**
 * Send per-habit reminders
 * Checks habits whose scheduledTime matches the current minute
 */
async function processHabitReminders() {
    try {
        // Get all habits with a scheduledTime and reminderEnabled
        const habits = await Habit.findAll({
            where: {
                isActive: true,
                reminderEnabled: true,
                scheduledTime: { [Op.ne]: null },
            },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'timezone', 'notificationEnabled', 'email'],
                where: { notificationEnabled: true },
            }]
        });

        for (const habit of habits) {
            const timezone = habit.user?.timezone || 'Asia/Jakarta';
            const currentTime = getCurrentTimeInTimezone(timezone);
            const habitTime = habit.scheduledTime?.substring(0, 5);

            if (currentTime === habitTime) {
                // Check if already completed today
                const todayStr = getTodayInTimezone(timezone);
                const alreadyDone = await HabitLog.findOne({
                    where: {
                        habitId: habit.id,
                        userId: habit.userId,
                        date: todayStr,
                    }
                });

                if (!alreadyDone) {
                    console.log(`⏰ Sending habit reminder: "${habit.name}" to user ${habit.user.email}`);
                    try {
                        await notificationService.sendHabitReminder(habit);
                    } catch (err) {
                        console.error(`Failed to send habit reminder "${habit.name}":`, err.message);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error in habit reminder processor:', error);
    }
}

/**
 * Start the notification scheduler
 */
export function startScheduler() {
    // Run every minute to check for reminders
    cron.schedule('* * * * *', async () => {
        await Promise.all([
            processDailyReminders(),
            processHabitReminders(),
        ]);
    });

    console.log('🕐 Notification scheduler started (checking every minute)');
}

export default { startScheduler };
