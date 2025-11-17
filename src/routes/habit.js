import express from 'express';
const router = express.Router();
import habitController from '../controllers/habitController.js';
import auth from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validator.js';

// All routes here require authentication
router.use(auth);

// Habit routes
router.get('/', habitController.getAllHabits);
router.post('/', validate(schemas.createHabit), habitController.createHabit);
router.get('/:id', habitController.getHabitById);
router.put('/:id', validate(schemas.updateHabit), habitController.updateHabit);
router.delete('/:id', habitController.deleteHabit);

// Habit log routes and stats
router.post('/:id/logs', validate(schemas.logHabit), habitController.logHabitCompletion);
router.get('/:id/stats', habitController.getStats);

export default router;