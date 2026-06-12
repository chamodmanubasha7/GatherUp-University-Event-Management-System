import mongoose from 'mongoose';
import Notification from '../models/Notification.js';

export async function listMine(req, res) {
  const items = await Notification.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(items);
}

export async function markRead(req, res) {
  await Notification.updateMany({ user: req.user.id, read: false }, { $set: { read: true } });
  res.json({ ok: true });
}

export async function deleteMine(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid notification id' });
  }
  const deleted = await Notification.findOneAndDelete({ _id: id, user: req.user.id });
  if (!deleted) {
    return res.status(404).json({ message: 'Notification not found' });
  }
  res.json({ ok: true });
}

export async function deleteAllMine(req, res) {
  await Notification.deleteMany({ user: req.user.id });
  res.json({ ok: true });
}
