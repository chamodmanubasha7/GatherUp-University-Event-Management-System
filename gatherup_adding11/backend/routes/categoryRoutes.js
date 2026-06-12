import { Router } from 'express';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

import { body } from 'express-validator';
import { handleValidation } from '../middleware/validate.js';

const router = Router();

router.get('/', listCategories);
router.post(
  '/',
  authenticate,
  requireAdmin,
  [body('name').trim().notEmpty().withMessage('Category name is required')],
  handleValidation,
  createCategory
);
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  [body('name').trim().notEmpty().withMessage('Category name is required')],
  handleValidation,
  updateCategory
);
router.delete('/:id', authenticate, requireAdmin, deleteCategory);

export default router;
