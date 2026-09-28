import { Router } from 'express';
import { submitReport, blockUser, getBlockedUsers } from '../controllers/moderation.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/report', requireAuth, submitReport);
router.post('/block', requireAuth, blockUser);
router.get('/blocks', requireAuth, getBlockedUsers);

export default router;
