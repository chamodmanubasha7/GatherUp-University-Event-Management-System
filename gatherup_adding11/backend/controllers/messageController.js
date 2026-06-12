import Message from '../models/Message.js';

export function serializeMessage(doc) {
  const o = doc.toObject ? doc.toObject() : { ...doc };
  if (o.deletedAt) {
    o.text = '';
    o.redacted = true;
  }
  return o;
}

/** PUT /api/messages/:id — sender only */
export async function editMessage(req, res) {
  const { text } = req.body;
  if (text == null || !String(text).trim()) {
    return res.status(400).json({ message: 'Message text is required' });
  }
  const msg = await Message.findById(req.params.id);
  if (!msg) return res.status(404).json({ message: 'Message not found' });
  if (msg.sender.toString() !== req.user.id) {
    return res.status(403).json({ message: 'You can only edit your own messages' });
  }
  if (msg.deletedAt) {
    return res.status(400).json({ message: 'Deleted messages cannot be edited' });
  }

  msg.text = String(text).trim();
  msg.editedAt = new Date();
  await msg.save();

  const populated = await Message.findById(msg._id).populate(
    'sender',
    'name email phone shareContactInLostFound'
  );
  res.json(serializeMessage(populated));
}

/** DELETE /api/messages/:id — soft delete, sender only */
export async function deleteMessage(req, res) {
  const msg = await Message.findById(req.params.id);
  if (!msg) return res.status(404).json({ message: 'Message not found' });
  if (msg.sender.toString() !== req.user.id) {
    return res.status(403).json({ message: 'You can only delete your own messages' });
  }
  if (msg.deletedAt) {
    return res.status(400).json({ message: 'Message already deleted' });
  }

  msg.deletedAt = new Date();
  await msg.save();

  const populated = await Message.findById(msg._id).populate(
    'sender',
    'name email phone shareContactInLostFound'
  );
  res.json(serializeMessage(populated));
}
