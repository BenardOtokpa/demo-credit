import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createUserSchema, loginSchema } from '../utils/validators';

const router = Router();

router.post(
  '/register',
  validate(createUserSchema),
  userController.register.bind(userController),
);

router.post(
  '/login',
  validate(loginSchema),
  userController.login.bind(userController),
);

router.get(
  '/profile',
  authenticate,
  userController.getProfile.bind(userController),
);

export default router;