import { Router } from 'express';
import { getAnalytics } from '../controllers/analyticsController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, requireAdmin, getAnalytics);

export default router;
