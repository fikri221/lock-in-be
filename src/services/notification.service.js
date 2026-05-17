

/*
Service for handling push notifications
Contains business logic for sending notifications
This separates business logic from HTTP concerns (controllers)
*/
import webpush from 'web-push';
import { PushSubscription } from '../models/index.js';
import { sequelize } from '../config/database';

class NotificationService {
    constructor() {
        // Configure VAPID keys
        webpush.setVapidDetails(
            process.env.VAPID_EMAIL,
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

    async removeSubscription(subscriptionId, userId) {
        const t = await sequelize.transaction();
        try {
            const pushSubscription = await PushSubscription.findOne({
                where: { id: subscriptionId, userId }
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

        subscriptions.forEach(subscription => {
            console.log('Sending notification to user:', userId);
            const pushSubscription = {
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: subscription.p256dh,
                    auth: subscription.auth,
                },
            };
            console.log('Sending notification to user:', pushSubscription);
            webpush.sendNotification(
                pushSubscription,
                JSON.stringify(payload)
            ).catch(error => {
                console.error('Error sending notification:', error);
            });
        });
    }

    async sendDailyReminderNotification(userId, payload) {
        console.log('Sending daily reminder notification to user:', userId);
        this.sendNotification(userId, payload);
    }

    async sendHabitReminderNotification(userId, payload) {
        console.log('Sending habit reminder notification to user:', userId);
        this.sendNotification(userId, payload);
    }
}

export default NotificationService;