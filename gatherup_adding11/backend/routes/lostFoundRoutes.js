import { Router } from 'express';
import {
  reportLost,
  reportFound,
  searchItems,
  getLostById,
  getFoundById,
  listMyLostFound,
  updateMyLost,
  updateMyFound,
  deleteMyLost,
  deleteMyFound,
  patchMyLostStatus,
  patchMyFoundStatus,
  notifyLostOwner,
  notifyFoundFinder,
  listAdminModerationQueue,
  setLostModeration,
  setFoundModeration,
  listAdminHiddenLostFound,
  adminPermanentlyDeleteHidden,
} from '../controllers/lostFoundController.js';
import {
  sendThreadMessage,
  getThreadMessages,
  listConversations,
  getUnreadMessageCount,
} from '../controllers/lfMessagesController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { optionalAuthenticate } from '../middleware/optionalAuth.js';
import { uploadOptional } from '../middleware/upload.js';

import { body } from 'express-validator';
import { handleValidation } from '../middleware/validate.js';

const router = Router();

router.get('/search', searchItems);
router.get('/lost/:id', optionalAuthenticate, getLostById);
router.get('/found/:id', optionalAuthenticate, getFoundById);

router.post(
  '/lost',
  authenticate,
  uploadOptional,
  [
    body('itemName')
      .trim()
      .notEmpty()
      .withMessage('Item title is required. Describe what was lost.'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Please provide a description to help finders identify the item.'),
    body('location')
      .trim()
      .notEmpty()
      .withMessage('Last known location is required. Where did you lose it?'),
    body('dateLost')
      .isISO8601()
      .toDate()
      .withMessage('Please provide a valid date when the item was lost.')
      .custom((value) => {
        if (new Date(value) > new Date()) {
          throw new Error('Lost date cannot be in the future. Please select a past or current date.');
        }
        return true;
      }),
  ],
  handleValidation,
  reportLost
);

router.post(
  '/found',
  authenticate,
  uploadOptional,
  [
    body('itemName')
      .trim()
      .notEmpty()
      .withMessage('Item title is required. Describe what you found.'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Please provide a description of the item found.'),
    body('location')
      .trim()
      .notEmpty()
      .withMessage('Discovery location is required. Where did you find it?'),
    body('dateFound')
      .isISO8601()
      .toDate()
      .withMessage('Please provide a valid date when the item was found.')
      .custom((value) => {
        if (new Date(value) > new Date()) {
          throw new Error('Found date cannot be in the future. Please select a past or current date.');
        }
        return true;
      }),
  ],
  handleValidation,
  reportFound
);

router.get('/dashboard/mine', authenticate, listMyLostFound);
router.put('/lost/:id', authenticate, uploadOptional, updateMyLost);
router.put('/found/:id', authenticate, uploadOptional, updateMyFound);
router.delete('/lost/:id', authenticate, deleteMyLost);
router.delete('/found/:id', authenticate, deleteMyFound);
router.patch('/lost/:id/status', authenticate, patchMyLostStatus);
router.patch('/found/:id/status', authenticate, patchMyFoundStatus);

router.post('/lost/:id/notify-owner', authenticate, notifyLostOwner);
router.post('/found/:id/notify-finder', authenticate, notifyFoundFinder);

router.post(
  '/messages',
  authenticate,
  [
    body('recipientId').isMongoId().withMessage('Valid recipient ID is required'),
    body('text').trim().notEmpty().withMessage('Message text is required'),
    body('lostItemId').optional().isMongoId(),
    body('foundItemId').optional().isMongoId(),
  ],
  handleValidation,
  sendThreadMessage
);
router.get('/messages', authenticate, getThreadMessages);
router.get('/messages/unread-count', authenticate, getUnreadMessageCount);
router.get('/conversations', authenticate, listConversations);

router.get('/admin/moderation', authenticate, requireAdmin, listAdminModerationQueue);
router.get('/admin/hidden', authenticate, requireAdmin, listAdminHiddenLostFound);
router.patch('/admin/moderate/lost/:id', authenticate, requireAdmin, setLostModeration);
router.patch('/admin/moderate/found/:id', authenticate, requireAdmin, setFoundModeration);
router.delete('/admin/:type/:id', authenticate, requireAdmin, adminPermanentlyDeleteHidden);

export default router;
