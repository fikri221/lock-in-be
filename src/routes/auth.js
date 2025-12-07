import express from 'express';
const router = express.Router();
import authController from '../controllers/auth.controller.js';
import { optionalAuth } from '../middlewares/auth.js';
import { validate, schemas } from '../middlewares/validator.js';

// Public routes
router.post('/register', validate(schemas.register), authController.register);

router.post('/login', validate(schemas.login), authController.login);
router.post('/logout', authController.logout);

// Protected routes
router.get("/me", optionalAuth, authController.me);

export default router;