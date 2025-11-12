const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControllers');
const habitController = require('../controllers/habitController');
const auth = require('../middleware/auth');
const { validator, schemas } = require('../middleware/validator');

// Public routes
router.post('/register', validator(schemas.register), authController.register);
router.post('/login', validator(schemas.login), authController.login);

// Protected routes
router.use("/me", auth, authController.me);

module.exports = router;