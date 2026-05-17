
/**
 * Notification Controller - Handles HTTP requests/responses
 * All business logic is delegated to the service layer
 */

import notificationService from '../services/notification.service.js';

const notificationController = {
    /**
     * Subscribe to push notifications
     * POST /api/notifications/subscribe
     */
    async subscribe(req, res, next) {
        try {
            const subscription = await notificationService.saveSubscription(req.body, req.userId);

            res.status(200).json({
                success: true,
                message: "Notification subscription saved successfully",
                subscription
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Unsubscribe from push notifications
     * POST /api/notifications/unsubscribe
     */
    async unsubscribe(req, res, next) {
        try {
            const result = await notificationService.removeSubscription(req.body.endpoint, req.userId);

            res.status(200).json({
                success: true,
                message: "Notification subscription removed successfully",
                ...result
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Update notification preferences
     * PUT /api/notifications/preferences
     */
    async updatePreferences(req, res, next) {
        try {
            const preferences = await notificationService.updatePreferences(req.body, req.userId);

            res.status(200).json({
                success: true,
                message: "Notification preferences updated successfully",
                preferences
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get notification preferences
     * GET /api/notifications/preferences
     */
    async getPreferences(req, res, next) {
        try {
            const preferences = await notificationService.getPreferences(req.userId);

            res.status(200).json({
                success: true,
                preferences
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Send test push notification to current user
     * POST /api/notifications/test
     */
    async sendTest(req, res, next) {
        try {
            const payload = {
                title: '🔔 Test Notification',
                body: 'Notifikasi berhasil! Push notifications aktif untuk Lock In.',
                icon: '/icons/icon-192x192.png',
                badge: '/icons/badge-72x72.png',
                url: '/',
            };

            await notificationService.sendNotification(req.userId, payload);

            res.status(200).json({
                success: true,
                message: "Test notification sent successfully"
            });
        } catch (error) {
            next(error);
        }
    }
};

export default notificationController;