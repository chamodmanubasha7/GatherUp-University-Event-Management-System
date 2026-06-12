import { Router } from 'express';
import {
  registerForEvent,
  cancelRegistration,
  listMyRegistrations,
  purchaseTicketForEvent,
} from '../controllers/registrationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/mine', authenticate, listMyRegistrations);
router.post('/event/:eventId/purchase', authenticate, purchaseTicketForEvent);
router.post('/event/:eventId', authenticate, registerForEvent);
router.delete('/event/:eventId', authenticate, cancelRegistration);

export default router;
