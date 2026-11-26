import { Role } from '@prisma/client';
import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { authRateLimiter } from '../middlewares/rateLimit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { loginSchema, registerSchema } from '../validators/auth.validator';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  asyncHandler(authController.register)
);

router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  asyncHandler(authController.login)
);

router.get('/me', authenticate, asyncHandler(authController.me));

router.get(
  '/admins',
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(authController.listAdmins)
);

export default router;
