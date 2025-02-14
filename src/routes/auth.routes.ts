import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/refresh-token', authController.refreshToken);

// Protected routes
router.post('/logout', authenticate, authController.logout);

export default router; 