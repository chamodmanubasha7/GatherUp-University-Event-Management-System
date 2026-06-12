import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { streamPaymentReceipt } from './paymentReceipt.js';

export async function getAllPayments(_req, res) {
  const payments = await Payment.find().populate('userId', 'name email role').sort({ createdAt: -1 });
  res.json({ success: true, payments });
}

export async function getPaymentById(req, res) {
  const payment = await Payment.findById(req.params.id).populate('userId', 'name email role');
  if (!payment) return res.status(404).json({ message: 'Payment not found' });
  res.json({ success: true, payment });
}

export async function recordPayment(req, res) {
  const { userId, eventName, amount, method, transactionId, notes, status } = req.body;
  if (!userId || !eventName || amount === undefined) {
    return res.status(400).json({ message: 'userId, eventName and amount are required' });
  }

  const user = await User.findById(userId).select('name email role');
  if (!user) return res.status(404).json({ message: 'Student not found' });

  const payment = await Payment.create({
    userId,
    eventName,
    amount: Number(amount),
    method: method || 'card',
    transactionId: transactionId || '',
    notes: notes || '',
    status: status || 'completed',
  });

  const populated = await payment.populate('userId', 'name email role');
  res.status(201).json({ success: true, payment: populated });
}

export async function updatePayment(req, res) {
  const { eventName, amount, method, transactionId, notes, status } = req.body;
  const payment = await Payment.findByIdAndUpdate(
    req.params.id,
    {
      eventName,
      amount: amount === undefined ? undefined : Number(amount),
      method,
      transactionId,
      notes,
      status,
    },
    { new: true, runValidators: true }
  ).populate('userId', 'name email role');

  if (!payment) return res.status(404).json({ message: 'Payment not found' });
  res.json({ success: true, payment });
}

export async function refundPayment(req, res) {
  const { refundReason } = req.body;
  const payment = await Payment.findById(req.params.id).populate('userId', 'name email role');
  if (!payment) return res.status(404).json({ message: 'Payment not found' });
  if (payment.status === 'refunded') {
    return res.status(400).json({ message: 'Payment already refunded' });
  }

  payment.status = 'refunded';
  payment.refundReason = refundReason || 'Refunded by admin';
  await payment.save();
  res.json({ success: true, payment });
}

export async function generateReceipt(req, res) {
  const payment = await Payment.findById(req.params.id).populate('userId', 'name email');
  if (!payment) return res.status(404).json({ message: 'Payment not found' });

  streamPaymentReceipt(res, payment);
  payment.receiptGeneratedAt = new Date();
  await payment.save();
}

export async function getUnpaidStudents(req, res) {
  const eventName = String(req.query.eventName || '').trim();
  const paidStudentIds = await Payment.distinct('userId', {
    status: 'completed',
    ...(eventName ? { eventName } : {}),
  });

  const query = { role: 'student', _id: { $nin: paidStudentIds } };
  const students = await User.find(query).select('name email role createdAt').sort({ name: 1 });
  res.json({
    success: true,
    eventName: eventName || null,
    students,
  });
}
