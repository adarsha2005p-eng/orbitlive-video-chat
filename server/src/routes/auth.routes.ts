import { Router } from 'express';
import { register, login, guestLogin, getMe, updateProfile, logout } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/guest', guestLogin);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);
router.put('/profile', requireAuth, updateProfile);

export default router;
