import { Router } from 'express';
import {
  listMyTickets,
  scanTicket,
  eventAttendanceReport,
  cleanupTicketsAdmin,
  deleteMyExpiredTickets,
  deleteMyTicketIfExpired,
  listTicketUsageLogs,
} from '../controllers/ticketController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.delete('/cleanup', authenticate, requireAdmin, cleanupTicketsAdmin);
router.get('/usage-logs', authenticate, requireAdmin, listTicketUsageLogs);
router.get('/mine', authenticate, listMyTickets);
router.delete('/mine/expired', authenticate, deleteMyExpiredTickets);
router.delete('/mine/:ticketId', authenticate, deleteMyTicketIfExpired);
router.post('/scan', authenticate, requireAdmin, scanTicket);
router.get('/attendance/:eventId', authenticate, requireAdmin, eventAttendanceReport);

export default router;
