import express from 'express';
import { 
  getAnnouncements, 
  getAnnouncementById, 
  createAnnouncement, 
  updateAnnouncement, 
  deleteAnnouncement, 
  getAnnouncementStats 
} from '../controllers/announcementController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getAnnouncements);
router.get('/stats/admin', authenticate, requireAdmin, getAnnouncementStats);
router.get('/:id', getAnnouncementById);
router.post('/', authenticate, requireAdmin, createAnnouncement);
router.put('/:id', authenticate, requireAdmin, updateAnnouncement);
router.delete('/:id', authenticate, requireAdmin, deleteAnnouncement);

export default router;
