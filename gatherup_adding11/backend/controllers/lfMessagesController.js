import mongoose from 'mongoose';
import Message from '../models/Message.js';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import { serializeMessage } from './messageController.js';

/** Messages the viewer has not removed from their own view (`deletedFor`). */
function visibleToUserClause(viewerId) {
  const oid = new mongoose.Types.ObjectId(viewerId);
  return {
    $expr: {
      $not: { $in: [oid, { $ifNull: ['$deletedFor', []] }] },
    },
  };
}

/** Match messages for a lost item (new + legacy field names in DB). */
function filterLostItemMessages(lostId) {
  return {
    $or: [{ lostItemId: lostId }, { relatedLostItem: lostId }],
  };
}

function filterFoundItemMessages(foundId) {
  return {
    $or: [{ foundItemId: foundId }, { relatedFoundItem: foundId }],
  };
}

async function lostThreadUserIds(lostId) {
  const lost = await LostItem.findById(lostId).select('reporter');
  if (!lost) return null;
  const ids = new Set([lost.reporter.toString()]);
  const rows = await Message.find(filterLostItemMessages(lostId)).select('sender receiver');
  for (const m of rows) {
    ids.add(m.sender.toString());
    ids.add(m.receiver.toString());
  }
  return ids;
}

async function foundThreadUserIds(foundId) {
  const found = await FoundItem.findById(foundId).select('finder');
  if (!found) return null;
  const ids = new Set([found.finder.toString()]);
  const rows = await Message.find(filterFoundItemMessages(foundId)).select('sender receiver');
  for (const m of rows) {
    ids.add(m.sender.toString());
    ids.add(m.receiver.toString());
  }
  return ids;
}

function resolveLostId(body) {
  return body.lostItemId || body.relatedLostItem || null;
}

function resolveFoundId(body) {
  return body.foundItemId || body.relatedFoundItem || null;
}

/** POST /messages — reply in an existing thread. */
export async function sendThreadMessage(req, res) {
  const senderId = req.user.id;
  const { recipientId, text } = req.body;
  const lostItemId = resolveLostId(req.body);
  const foundItemId = resolveFoundId(req.body);

  if (!text?.trim()) return res.status(400).json({ message: 'Message required' });
  if ((lostItemId && foundItemId) || (!lostItemId && !foundItemId)) {
    return res.status(400).json({ message: 'Provide exactly one of lostItemId or foundItemId' });
  }
  if (recipientId === senderId) return res.status(400).json({ message: 'Invalid recipient' });

  if (lostItemId) {
    const lost = await LostItem.findById(lostItemId);
    if (!lost || lost.isDeleted) return res.status(404).json({ message: 'Lost item not found' });
    const ids = await lostThreadUserIds(lostItemId);
    if (!ids || !ids.has(senderId) || !ids.has(recipientId)) {
      return res.status(403).json({ message: 'You are not part of this conversation' });
    }
    const msg = await Message.create({
      sender: senderId,
      receiver: recipientId,
      text: text.trim(),
      lostItemId,
    });
    const populated = await Message.findById(msg._id).populate('sender', 'name email phone shareContactInLostFound');
    return res.status(201).json(serializeMessage(populated));
  }

  const found = await FoundItem.findById(foundItemId);
  if (!found || found.isDeleted) return res.status(404).json({ message: 'Found item not found' });
  const ids = await foundThreadUserIds(foundItemId);
  if (!ids || !ids.has(senderId) || !ids.has(recipientId)) {
    return res.status(403).json({ message: 'You are not part of this conversation' });
  }
  const msg = await Message.create({
    sender: senderId,
    receiver: recipientId,
    text: text.trim(),
    foundItemId,
  });
  const populated = await Message.findById(msg._id).populate('sender', 'name email phone shareContactInLostFound');
  return res.status(201).json(serializeMessage(populated));
}

export async function getThreadMessages(req, res) {
  const uid = req.user.id;
  const lostItemId = req.query.lostItemId || req.query.relatedLostItem;
  const foundItemId = req.query.foundItemId || req.query.relatedFoundItem;
  const { withUserId } = req.query;
  if (!withUserId) return res.status(400).json({ message: 'withUserId is required' });
  const pair = {
    $or: [
      { sender: uid, receiver: withUserId },
      { sender: withUserId, receiver: uid },
    ],
  };
  const q = { ...pair };
  if (lostItemId) Object.assign(q, filterLostItemMessages(lostItemId));
  else if (foundItemId) Object.assign(q, filterFoundItemMessages(foundItemId));
  /* else: all messages between the two users (any listing) */

  const filter = { $and: [q, visibleToUserClause(uid)] };

  const messages = await Message.find(filter)
    .sort({ createdAt: 1 })
    .populate('sender', 'name email phone shareContactInLostFound')
    .populate('receiver', 'name email phone shareContactInLostFound');

  await Message.updateMany(
    {
      $and: [
        q,
        visibleToUserClause(uid),
        { receiver: uid },
        { $nor: [{ read: true }, { readByReceiver: true }] },
      ],
    },
    { $set: { read: true, readByReceiver: true } }
  );
  res.json(messages);
}

/**
 * DELETE /api/messages/conversation/:otherUserId/:itemId?itemType=lost|found
 * DELETE /api/messages/conversation/:otherUserId — all messages between the two users
 * Marks messages as hidden for the current user only (`deleteFor` / `deletedFor`).
 */
export async function deleteConversationForUser(req, res) {
  const uid = req.user.id;
  const { otherUserId, itemId } = req.params;
  const itemType = req.query.itemType;

  if (!otherUserId || String(otherUserId) === String(uid)) {
    return res.status(400).json({ message: 'Invalid conversation' });
  }

  const pair = {
    $or: [
      { sender: uid, receiver: otherUserId },
      { sender: otherUserId, receiver: uid },
    ],
  };

  let thread = { ...pair };
  if (itemId) {
    if (itemType === 'lost') Object.assign(thread, filterLostItemMessages(itemId));
    else if (itemType === 'found') Object.assign(thread, filterFoundItemMessages(itemId));
    else {
      return res.status(400).json({ message: 'Query itemType must be "lost" or "found" when itemId is in the path' });
    }
  }

  const oid = new mongoose.Types.ObjectId(uid);
  const result = await Message.updateMany(
    {
      $and: [
        thread,
        {
          $expr: {
            $not: { $in: [oid, { $ifNull: ['$deletedFor', []] }] },
          },
        },
      ],
    },
    { $addToSet: { deletedFor: uid } }
  );

  res.json({
    message: 'Conversation hidden for you',
    updated: result.modifiedCount,
    matched: result.matchedCount,
  });
}

function populatedLost(m) {
  const v = m.lostItemId ?? m.relatedLostItem;
  if (v && typeof v === 'object' && v.itemName != null) return v;
  return null;
}

function populatedFound(m) {
  const v = m.foundItemId ?? m.relatedFoundItem;
  if (v && typeof v === 'object' && v.itemName != null) return v;
  return null;
}

function rawLostId(m) {
  const p = populatedLost(m);
  return p?._id?.toString() || m.lostItemId?.toString() || m.relatedLostItem?.toString() || '';
}

function rawFoundId(m) {
  const p = populatedFound(m);
  return p?._id?.toString() || m.foundItemId?.toString() || m.relatedFoundItem?.toString() || '';
}

export async function listConversations(req, res) {
  const uid = req.user.id;
  const msgs = await Message.find({
    $and: [{ $or: [{ sender: uid }, { receiver: uid }] }, visibleToUserClause(uid)],
  })
    .sort({ createdAt: -1 })
    .limit(500)
    .populate('sender', 'name email phone shareContactInLostFound')
    .populate('receiver', 'name email phone shareContactInLostFound')
    .populate('lostItemId', 'publicId itemName status')
    .populate('foundItemId', 'publicId itemName status')
    .populate('relatedLostItem', 'publicId itemName status')
    .populate('relatedFoundItem', 'publicId itemName status');

  const seen = new Map();
  for (const m of msgs) {
    const other = m.sender._id.toString() === uid ? m.receiver : m.sender;
    const lid = rawLostId(m);
    const fid = rawFoundId(m);
    const key = `${lid}|${fid}|${other._id.toString()}`;
    const lostItem = populatedLost(m);
    const foundItem = populatedFound(m);
    if (!seen.has(key)) {
      seen.set(key, {
        otherUser: {
          id: other._id,
          name: other.name,
          sharedEmail: other.shareContactInLostFound ? other.email : null,
          sharedPhone: other.shareContactInLostFound ? other.phone || null : null,
        },
        lostItem: lostItem && lostItem.itemName != null ? lostItem : null,
        foundItem: foundItem && foundItem.itemName != null ? foundItem : null,
        lastMessage: {
          text: m.deletedAt ? 'Message deleted' : m.text,
          createdAt: m.createdAt,
          fromMe: m.sender._id.toString() === uid,
          deleted: Boolean(m.deletedAt),
        },
      });
    }
  }

  const conversations = [];
  for (const [, c] of seen) {
    const otherId = c.otherUser.id?.toString?.();
    const pair = {
      $or: [
        { sender: uid, receiver: otherId },
        { sender: otherId, receiver: uid },
      ],
    };
    const lostId = c.lostItem?._id;
    const foundId = c.foundItem?._id;
    if (!lostId && !foundId) continue;
    const base = lostId
      ? { ...pair, ...filterLostItemMessages(lostId) }
      : { ...pair, ...filterFoundItemMessages(foundId) };
    const unread = await Message.countDocuments({
      $and: [
        base,
        visibleToUserClause(uid),
        { receiver: uid },
        { $nor: [{ read: true }, { readByReceiver: true }] },
        { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] },
      ],
    });
    conversations.push({ ...c, unread });
  }

  conversations.sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));
  res.json({ conversations });
}

export async function getUnreadMessageCount(req, res) {
  const uid = req.user.id;
  const count = await Message.countDocuments({
    $and: [
      visibleToUserClause(uid),
      { receiver: uid },
      { $nor: [{ read: true }, { readByReceiver: true }] },
      { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] },
    ],
  });
  res.json({ count });
}
