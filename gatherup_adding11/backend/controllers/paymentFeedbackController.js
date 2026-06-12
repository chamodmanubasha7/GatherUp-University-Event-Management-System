import Payment from '../models/Payment.js';
import PaymentFeedback from '../models/PaymentFeedback.js';

export async function submitFeedback(req, res) {
  const { paymentId, rating, comment } = req.body;
  if (!paymentId || !rating) {
    return res.status(400).json({ message: 'paymentId and rating are required' });
  }

  const normalizedRating = Number(rating);
  if (normalizedRating < 1 || normalizedRating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });
  }

  const payment = await Payment.findOne({
    _id: paymentId,
    userId: req.user.id,
    status: 'completed',
  });
  if (!payment) {
    return res.status(403).json({ message: 'Only attendees with completed payments may review' });
  }

  try {
    const feedback = await PaymentFeedback.create({
      userId: req.user.id,
      paymentId,
      rating: normalizedRating,
      comment: comment || '',
    });
    res.status(201).json({ success: true, feedback });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You have already reviewed this payment' });
    }
    throw err;
  }
}

export async function getMyFeedbacks(req, res) {
  const feedbacks = await PaymentFeedback.find({ userId: req.user.id })
    .populate('paymentId', 'eventName amount createdAt status')
    .sort({ createdAt: -1 });
  res.json({ success: true, feedbacks });
}

export async function getAllFeedbacks(_req, res) {
  const feedbacks = await PaymentFeedback.find()
    .populate('userId', 'name email')
    .populate('paymentId', 'eventName amount createdAt status')
    .sort({ createdAt: -1 });
  res.json({ success: true, feedbacks });
}

export async function updateMyFeedback(req, res) {
  const normalizedRating = Number(req.body.rating);
  if (normalizedRating < 1 || normalizedRating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });
  }

  const feedback = await PaymentFeedback.findOne({ _id: req.params.id, userId: req.user.id });
  if (!feedback) return res.status(404).json({ message: 'Feedback not found' });

  feedback.rating = normalizedRating;
  feedback.comment = req.body.comment || '';
  await feedback.save();

  res.json({ success: true, feedback });
}

export async function deleteMyFeedback(req, res) {
  const feedback = await PaymentFeedback.findOne({ _id: req.params.id, userId: req.user.id });
  if (!feedback) return res.status(404).json({ message: 'Feedback not found' });
  await feedback.deleteOne();
  res.json({ success: true, message: 'Feedback deleted' });
}

export async function deleteFeedback(req, res) {
  const feedback = await PaymentFeedback.findById(req.params.id);
  if (!feedback) return res.status(404).json({ message: 'Feedback not found' });
  await feedback.deleteOne();
  res.json({ success: true, message: 'Feedback deleted successfully' });
}
