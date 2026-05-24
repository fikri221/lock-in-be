

/*
Service for handling push notifications
Contains business logic for sending notifications
This separates business logic from HTTP concerns (controllers)
*/
import webpush from 'web-push';
import { PushSubscription, User } from '../models/index.js';
import { sequelize } from '../config/database.js';

class NotificationService {
    constructor() {
        // Configure VAPID keys
        let vapidEmail = process.env.VAPID_EMAIL;
        if (vapidEmail && !vapidEmail.startsWith('mailto:') && !vapidEmail.startsWith('http://') && !vapidEmail.startsWith('https://')) {
            vapidEmail = `mailto:${vapidEmail}`;
        }

        webpush.setVapidDetails(
            vapidEmail,
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
    }

    async saveSubscription(subscription, userId) {
        const t = await sequelize.transaction();
        try {
            const pushSubscription = await PushSubscription.create({
                userId,
                ...subscription,
            }, { transaction: t });

            await t.commit();
            return pushSubscription;
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    async removeSubscription(endpoint, userId) {
        const t = await sequelize.transaction();
        try {
            const pushSubscription = await PushSubscription.findOne({
                where: { endpoint, userId }
            });

            if (!pushSubscription) {
                const error = new Error('Subscription not found');
                error.statusCode = 404;
                throw error;
            }

            await pushSubscription.destroy({ transaction: t });
            await t.commit();
            return pushSubscription;
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    async sendNotification(userId, payload) {
        console.log('Sending notification to user:', userId);
        const subscriptions = await PushSubscription.findAll({
            where: { userId, isActive: true }
        });

        for (const subscription of subscriptions) {
            const pushSubscription = {
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: subscription.p256dh,
                    auth: subscription.auth,
                },
            };
            try {
                await webpush.sendNotification(
                    pushSubscription,
                    JSON.stringify(payload)
                );
            } catch (error) {
                if (error.statusCode === 410) {
                    console.log('Subscription expired. Removing from database...', subscription.endpoint);
                    await subscription.destroy();
                } else {
                    console.error('Error sending notification:', error);
                }
            }
        }
    }

    async sendDailyReminderNotification(userId, payload) {
        console.log('Sending daily reminder notification to user:', userId);
        this.sendNotification(userId, payload);
    }

    async sendHabitReminderNotification(userId, payload) {
        console.log('Sending habit reminder notification to user:', userId);
        this.sendNotification(userId, payload);
    }

    async getPreferences(userId) {
        const user = await User.findByPk(userId);
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }
        return {
            notificationEnabled: user.notificationEnabled,
            reminderTime: user.reminderTime,
        };
    }

    async updatePreferences(preferencesData, userId) {
        const t = await sequelize.transaction();
        try {
            const user = await User.findByPk(userId, { transaction: t });
            if (!user) {
                const error = new Error('User not found');
                error.statusCode = 404;
                throw error;
            }

            const updateData = {};
            if (preferencesData.notificationEnabled !== undefined) {
                updateData.notificationEnabled = preferencesData.notificationEnabled;
            }
            if (preferencesData.reminderTime !== undefined) {
                updateData.reminderTime = preferencesData.reminderTime;
            }

            await user.update(updateData, { transaction: t });
            await t.commit();

            return {
                notificationEnabled: user.notificationEnabled,
                reminderTime: user.reminderTime,
            };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    async sendDailySummary(userId) {
        const payload = {
            title: '☀️ Daily Habit Summary',
            body: 'Jangan lupa untuk menyelesaikan habit kamu hari ini!',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            url: '/',
        };
        await this.sendNotification(userId, payload);
    }

    async sendHabitReminder(habit) {
        const payload = {
            title: `⏰ Reminder: ${habit.name}`,
            body: `Saatnya melakukan "${habit.name}" sekarang!`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            url: `/habits/${habit.id}`,
        };
        await this.sendNotification(habit.userId, payload);
    }
}

export default new NotificationService();