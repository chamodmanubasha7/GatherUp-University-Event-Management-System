import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  deleteFeedback,
  deleteMyFeedback,
  getAllFeedbacks,
  getMyFeedbacks,
  submitFeedback,
  updateMyFeedback,
} from '../controllers/paymentFeedbackController.js';

const router = Router();

router.post('/', authenticate, submitFeedback);
router.get('/mine', authenticate, getMyFeedbacks);
router.put('/mine/:id', authenticate, updateMyFeedback);
router.delete('/mine/:id', authenticate, deleteMyFeedback);
router.get('/all', authenticate, requireAdmin, getAllFeedbacks);
router.delete('/:id', authenticate, requireAdmin, deleteFeedback);

export default router;
