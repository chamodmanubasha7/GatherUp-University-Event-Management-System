import Feedback from '../models/Feedback.js';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import Notification from '../models/Notification.js';

export async function createFeedback(req, res) {
  const { eventId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user.id;

  const event = await Event.findById(eventId);
  if (!event) return res.status(404).json({ message: 'Event not found' });

  if (new Date(event.startDateTime) > new Date()) {
    return res.status(400).json({ message: 'You can only leave feedback after the event has started' });
  }

  const reg = await Registration.findOne({ user: userId, event: eventId, confirmed: true });
  if (!reg) {
    return res.status(403).json({ message: 'Only confirmed ticket holders may leave feedback' });
  }

  try {
    const fb = await Feedback.create({
      user: userId,
      event: eventId,
      rating: Number(rating),
      comment: comment || '',
    });
    res.status(201).json(fb);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You already submitted feedback for this event' });
    }
    res.status(400).json({ message: err.message });
  }
}

export async function updateFeedback(req, res) {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user.id;

  try {
    const fb = await Feedback.findById(id);
    if (!fb) return res.status(404).json({ message: 'Feedback not found' });

    if (String(fb.user) !== String(userId)) {
      return res.status(403).json({ message: 'Not authorized to edit this feedback' });
    }

    if (fb.status === 'banned') {
      return res.status(403).json({ message: 'Banned feedback cannot be edited' });
    }

    fb.rating = Number(rating);
    fb.comment = comment || '';
    await fb.save();

    res.json(fb);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function banFeedback(req, res) {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const fb = await Feedback.findById(id).populate('event');
    if (!fb) return res.status(404).json({ message: 'Feedback not found' });

    fb.status = 'banned';
    fb.banReason = reason || 'Inappropriate content';
    await fb.save();

    // Notify user
    await Notification.create({
      user: fb.user,
      title: 'Feedback Banned',
      message: `Your review for "${fb.event.title}" has been removed because it was found to be inappropriate.`,
      meta: { kind: 'generic', event: fb.event._id }
    });

    res.json({ message: 'Feedback banned and user notified' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function listFeedbackForEvent(req, res) {
  const { eventId } = req.params;
  const event = await Event.findById(eventId);
  if (!event) return res.status(404).json({ message: 'Event not found' });

  // Only open feedback to public after event starts
  if (new Date(event.startDateTime) > new Date()) {
    return res.json({ feedback: [], averageRating: 0 });
  }

  const items = await Feedback.find({ event: eventId, status: 'active' })
    .populate('user', 'name email')
    .sort({ createdAt: -1 });

  const averageRating = items.length > 0 
    ? (items.reduce((acc, curr) => acc + curr.rating, 0) / items.length).toFixed(1)
    : 0;

  res.json({ feedback: items, averageRating: Number(averageRating) });
}
