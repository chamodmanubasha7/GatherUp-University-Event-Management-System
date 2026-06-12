import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  addCard,
  getMyPayments,
  getMyReceipt,
  getProfile,
  makePayment,
  deleteCard,
} from '../controllers/paymentUserController.js';

import { body } from 'express-validator';
import { handleValidation } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  [
    body('eventName').trim().notEmpty().withMessage('Event name is required to process payment'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Payment amount must be a positive number greater than zero'),
    body('method')
      .optional()
      .isIn(['card', 'cash', 'upi', 'netbanking'])
      .withMessage('Please select a supported payment method (card, upi, netbanking, or cash)'),
  ],
  handleValidation,
  makePayment
);
router.get('/', getMyPayments);
router.get('/profile', getProfile);
router.post(
  '/cards',
  [
    body('cardName')
      .trim()
      .notEmpty()
      .withMessage('Card nickname is required (e.g., "My Visa") to identify it later'),
    body('cardNumber')
      .isCreditCard()
      .withMessage('Please enter a valid 16-digit credit card number without spaces or dashes'),
    body('expiry')
      .matches(/^(0[1-9]|1[0-2])\/\d{2}$/)
      .withMessage('Expiry date must be in MM/YY format (e.g., 12/26)'),
    body('cvv')
      .isNumeric()
      .isLength({ min: 3, max: 4 })
      .withMessage('CVV must be a 3 or 4 digit number found on the back of your card'),
  ],
  handleValidation,
  addCard
);
router.delete('/cards/:cardId', deleteCard);
router.get('/:id/receipt', getMyReceipt);

export default router;
