import { Router } from 'express';
import {
  listVenues,
  createVenue,
  updateVenue,
  deleteVenue,
} from '../controllers/venueController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

import { body } from 'express-validator';
import { handleValidation } from '../middleware/validate.js';

const router = Router();

router.get('/', listVenues);
router.post(
  '/',
  authenticate,
  requireAdmin,
  [
    body('name').trim().notEmpty().withMessage('Venue name is required'),
    body('location').trim().notEmpty().withMessage('Location is required'),
    body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  ],
  handleValidation,
  createVenue
);
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  [
    body('name').optional().trim().notEmpty(),
    body('location').optional().trim().notEmpty(),
    body('capacity').optional().isInt({ min: 1 }),
  ],
  handleValidation,
  updateVenue
);
router.delete('/:id', authenticate, requireAdmin, deleteVenue);

export default router;
