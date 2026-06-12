import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { createClaim } from '../controllers/lostFoundController.js';

const router = Router();

router.post('/', authenticate, createClaim);

export default router;
