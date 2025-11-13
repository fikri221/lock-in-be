const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControllers');
const auth = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validator');

// Public routes
router.post('/register', validate(schemas.register), authController.register);
router.post('/login', validate(schemas.login), authController.login);

// Protected routes
router.get("/me", auth, authController.me);

export default router;