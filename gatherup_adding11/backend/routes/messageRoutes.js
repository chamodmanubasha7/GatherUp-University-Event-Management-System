import { Router } from 'express';
import { editMessage, deleteMessage } from '../controllers/messageController.js';
import { deleteConversationForUser } from '../controllers/lfMessagesController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.delete('/conversation/:otherUserId/:itemId', deleteConversationForUser);
router.delete('/conversation/:otherUserId', deleteConversationForUser);
router.put('/:id', editMessage);
router.delete('/:id', deleteMessage);

export default router;
