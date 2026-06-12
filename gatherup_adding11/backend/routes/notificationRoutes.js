import { Router } from 'express';
import {
  listMine,
  markRead,
  deleteMine,
  deleteAllMine,
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, listMine);
router.post('/read-all', authenticate, markRead);
router.delete('/', authenticate, deleteAllMine);
router.delete('/:id', authenticate, deleteMine);

export default router;
