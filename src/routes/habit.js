const express = require('express');
const router = express.Router();
const habitController = require('../controllers/habitController');
const auth = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validator');

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