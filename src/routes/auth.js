import express from 'express';
const router = express.Router();
import authController from '../controllers/authControllers.js';
import auth from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validator.js';

// Public routes
router.post('/register', validate(schemas.register), authController.register);
router.post('/login', validate(schemas.login), authController.login);

// Protected routes
router.get("/me", auth, authController.me);

export default router;