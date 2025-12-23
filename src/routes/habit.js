import express from 'express';
const router = express.Router();
import habitController from '../controllers/habit.controller.js';
import auth from '../middlewares/auth.js';
import { validate, schemas } from '../middlewares/validator.js';

// All routes here require authentication
router.use(auth);

// Habit routes
router.get('/', habitController.getAllHabits);
router.post('/', validate(schemas.createHabit), habitController.createHabit);
router.get('/:id', habitController.getHabitById);
router.put('/:id', validate(schemas.updateHabit), habitController.updateHabit);
router.delete('/:id', habitController.deleteHabit);
// Cancel/Undo habit completion
router.post('/:id/cancel', habitController.cancelCompletion);

// Habit log routes and stats
router.post('/:id/logs', validate(schemas.logHabit), habitController.logHabitCompletion);
router.post('/:id/mood-energy', validate(schemas.logMoodEnergy), habitController.logMoodEnergy);
router.get('/:id/stats', habitController.getStats);
router.get('/:id/heatmap', habitController.getHeatmap);

export default router;