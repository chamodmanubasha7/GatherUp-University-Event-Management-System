import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { streamPaymentReceipt } from './paymentReceipt.js';

export async function makePayment(req, res) {
  const { eventName, amount, method, transactionId } = req.body;
  if (!eventName || amount === undefined) {
    return res.status(400).json({ message: 'eventName and amount are required' });
  }

  const payment = await Payment.create({
    userId: req.user.id,
    eventName,
    amount: Number(amount),
    method: method || 'card',
    transactionId: transactionId || `TXN-${Date.now()}`,
    status: 'completed',
  });

  res.status(201).json({ success: true, payment });
}

export async function getMyPayments(req, res) {
  const payments = await Payment.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json({ success: true, payments });
}

export async function getMyReceipt(req, res) {
  const payment = await Payment.findOne({ _id: req.params.id, userId: req.user.id }).populate(
    'userId',
    'name email'
  );
  if (!payment) return res.status(404).json({ message: 'Payment not found' });

  streamPaymentReceipt(res, payment);
  payment.receiptGeneratedAt = new Date();
  await payment.save();
}

export async function getProfile(req, res) {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Ensure all cards have IDs (for deletion of legacy data)
  let changed = false;
  user.savedCards.forEach((card) => {
    if (!card._id) {
      card._id = new mongoose.Types.ObjectId();
      changed = true;
    }
  });
  if (changed) {
    user.markModified('savedCards');
    await user.save();
  }

  res.json({ success: true, user });
}

export async function addCard(req, res) {
  const { cardName, cardNumber, expiry, cvv } = req.body;
  if (!cardNumber || !expiry || !cvv) {
    return res.status(400).json({ message: 'Card number, expiry, and CVV are required' });
  }

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.savedCards.push({
    cardName: cardName || 'My Card',
    cardNumber: String(cardNumber).trim(),
    expiry: String(expiry).trim(),
    cvv: String(cvv).trim(),
  });
  await user.save();

  res.status(201).json({ success: true, cards: user.savedCards });
}

export async function deleteCard(req, res) {
  try {
    const { cardId } = req.params;
    console.log(`[deleteCard] Attempting to delete card ${cardId} for user ${req.user.id}`);

    if (!cardId || cardId === 'undefined') {
      console.warn('[deleteCard] Invalid cardId received');
      return res.status(400).json({ message: 'Valid card ID required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const card = user.savedCards.id(cardId);
    if (card) {
      console.log(`[deleteCard] Found card ${card.cardName} by ID, removing...`);
      card.deleteOne();
    } else {
      console.warn(`[deleteCard] Card ${cardId} not found by ID. Trying fallback by other fields...`);
      // Fallback for legacy data that might still be missing _id despite migration
      // We look for any card that might match the "undefined" or broken ID case
      // Or just try to find a card that doesn't have an ID and matches the request if we had more info
      // But since we only have cardId, and it failed, we'll try to use user.savedCards.pull as a catch-all
      user.savedCards.pull({ _id: cardId });
      
      // If pull didn't change length, we might have a bigger issue
      const initialLength = user.savedCards.length;
      if (user.savedCards.length === initialLength) {
        console.warn('[deleteCard] No card removed after pull attempt.');
      }
    }

    await user.save();
    console.log('[deleteCard] User saved successfully. Remaining cards:', user.savedCards.length);

    res.json({ success: true, cards: user.savedCards });
  } catch (err) {
    console.error('[deleteCard] Error:', err);
    res.status(500).json({ message: 'Failed to delete card' });
  }
}
