import { Router } from 'express';
import { body } from 'express-validator';
import { 
  createFeedback, 
  listFeedbackForEvent, 
  updateFeedback, 
  banFeedback 
} from '../controllers/feedbackController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { handleValidation } from '../middleware/validate.js';

const router = Router();

router.get('/event/:eventId', listFeedbackForEvent);
router.post(
  '/event/:eventId',
  authenticate,
  [body('rating').isInt({ min: 1, max: 5 }), body('comment').optional().isString()],
  handleValidation,
  createFeedback
);

router.put(
  '/:id',
  authenticate,
  [body('rating').isInt({ min: 1, max: 5 }), body('comment').optional().isString()],
  handleValidation,
  updateFeedback
);

router.post('/:id/ban', authenticate, requireAdmin, banFeedback);

export default router;
