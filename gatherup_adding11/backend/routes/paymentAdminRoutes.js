import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  generateReceipt,
  getAllPayments,
  getPaymentById,
  getUnpaidStudents,
  recordPayment,
  refundPayment,
  updatePayment,
} from '../controllers/paymentAdminController.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/unpaid-students', getUnpaidStudents);
router.get('/', getAllPayments);
router.get('/:id', getPaymentById);
router.post('/', recordPayment);
router.put('/:id', updatePayment);
router.post('/:id/refund', refundPayment);
router.get('/:id/receipt', generateReceipt);

export default router;
