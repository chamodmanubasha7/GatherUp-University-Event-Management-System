import { Router } from 'express';
import { recommendForUser } from '../controllers/recommendController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, recommendForUser);

export default router;
