
/*

*/

import express from 'express';
const router = express.Router();
import notificationController from '../controllers/notification.controller.js';
import auth from '../middlewares/auth.js';

// All routes here require authentication
router.use(auth);

// Notification routes
router.post('/subscribe', notificationController.subscribe);
router.post('/unsubscribe', notificationController.unsubscribe);
router.put('/preferences', notificationController.updatePreferences);
router.get('/preferences', notificationController.getPreferences);
router.post('/test', notificationController.sendTest);

export default router;
