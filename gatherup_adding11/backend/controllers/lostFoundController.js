import mongoose from 'mongoose';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import Registration from '../models/Registration.js';
import Message from '../models/Message.js';
import { getPublicUploadPath } from '../middleware/upload.js';
import { makePublicId } from '../utils/publicId.js';
import { sendMail } from '../utils/email.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import FoundItemClaim from '../models/FoundItemClaim.js';
import { assertNotFutureDate } from '../utils/dateValidation.js';
import {
  rolling24hStart,
  maxLostFoundPostsPer24h,
  maxFoundClaimsPer24h,
} from '../config/lostFoundLimits.js';

function pushHistory(doc, status, note) {
  doc.statusHistory = doc.statusHistory || [];
  doc.statusHistory.push({ status, note });
}

/** True if listing is hidden from public (new or legacy field). */
function listingHidden(doc) {
  return Boolean(doc?.hidden || doc?.moderationHidden);
}

async function buildContactFooter(userId) {
  const u = await User.findById(userId).select('email phone shareContactInLostFound name');
  if (!u?.shareContactInLostFound) return '';
  const parts = [];
  if (u.email) parts.push(`Email: ${u.email}`);
  if (u.phone) parts.push(`Phone: ${u.phone}`);
  return parts.length ? `\n\nShared contact:\n${parts.join('\n')}` : '';
}

async function notifyUser(userId, title, message, link = '', meta = undefined) {
  if (!userId) return;
  const id = userId._id?.toString?.() || userId.toString();
  const doc = { user: id, title, message, link: link || '' };
  if (meta) {
    doc.meta = {
      kind: meta.kind || 'generic',
      lostItem: meta.lostItem ?? null,
      foundItem: meta.foundItem ?? null,
      fromUser: meta.fromUser ?? null,
      event: meta.event ?? null,
    };
    if (meta.relatedItemId != null) doc.relatedItemId = meta.relatedItemId;
    if (meta.relatedItemType != null) doc.relatedItemType = meta.relatedItemType;
  }
  await Notification.create(doc);
  const user = await User.findById(id);
  if (user?.email) {
    await sendMail({ to: user.email, subject: title, text: message });
  }
}

const notDeleted = { $ne: true };

function dailyPostLimitMessage(max) {
  return max === 5 ? 'You can only post 5 items per day' : `You can only post ${max} items per day`;
}

function claimLimitMessage(max) {
  return max === 1
    ? 'You can only claim one item per day'
    : `You can only claim up to ${max} found item(s) per day`;
}

async function countUserPostsLast24h(userId, kind) {
  const since = rolling24hStart();
  if (kind === 'lost') {
    return LostItem.countDocuments({ reporter: userId, createdAt: { $gte: since } });
  }
  return FoundItem.countDocuments({ finder: userId, createdAt: { $gte: since } });
}

async function ensureDailyPostBudget(res, userId, kind) {
  const max = maxLostFoundPostsPer24h();
  const count = await countUserPostsLast24h(userId, kind);
  if (count >= max) {
    res.status(400).json({ message: dailyPostLimitMessage(max) });
    return false;
  }
  return true;
}

/** Registration must exist and be confirmed (or legacy doc without `confirmed`). */
async function findConfirmedRegistration(userId, eventId) {
  return Registration.findOne({
    user: userId,
    event: eventId,
    $or: [{ confirmed: true }, { confirmed: { $exists: false } }],
  });
}

function formatValidationError(err) {
  if (err.name !== 'ValidationError' || !err.errors) return err.message || 'Could not save';
  return Object.values(err.errors)
    .map((e) => e.message)
    .join('. ');
}

/** Public search: not deleted and not hidden (hidden or legacy moderationHidden). */
function publicListingFilter() {
  return {
    isDeleted: notDeleted,
    hidden: notDeleted,
    moderationHidden: notDeleted,
  };
}

async function assertNoDuplicateLost(reporter, itemName, location) {
  const dup = await LostItem.findOne({
    reporter,
    isDeleted: notDeleted,
    itemName: new RegExp(`^${itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    location: new RegExp(`^${location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    status: 'Looking',
  });
  return dup;
}

function viewerMaySeeLost(doc, reqUser) {
  if (!doc || doc.isDeleted) return false;
  const owner = (doc.reporter?._id ?? doc.reporter)?.toString?.() ?? '';
  if (owner && reqUser?.id === owner) return true;
  if (listingHidden(doc) && reqUser?.role !== 'admin') return false;
  if (listingHidden(doc) && reqUser?.role === 'admin') return true;
  return true;
}

function viewerMaySeeFound(doc, reqUser) {
  if (!doc || doc.isDeleted) return false;
  const finder = (doc.finder?._id ?? doc.finder)?.toString?.() ?? '';
  if (finder && reqUser?.id === finder) return true;
  if (listingHidden(doc) && reqUser?.role !== 'admin') return false;
  if (listingHidden(doc) && reqUser?.role === 'admin') return true;
  return true;
}

/**
 * LostItem uses `reporter`, FoundItem uses `finder` (not `userId`).
 * Adds `user: { _id, name }` for API consumers; `null` if the poster account no longer exists.
 */
function addPosterUserField(plain, kind) {
  const p = plain && typeof plain === 'object' ? { ...plain } : {};
  const key = kind === 'lost' ? 'reporter' : 'finder';
  const ref = p[key];
  if (ref && typeof ref === 'object' && ref._id != null) {
    p.user = { _id: ref._id, name: ref.name ?? null };
  } else {
    p.user = null;
  }
  return p;
}

function serializeLost(docOrPlain) {
  const plain = docOrPlain?.toObject?.() ?? docOrPlain;
  return addPosterUserField(plain, 'lost');
}

function serializeFound(docOrPlain) {
  const plain = docOrPlain?.toObject?.() ?? docOrPlain;
  return addPosterUserField(plain, 'found');
}

export async function reportLost(req, res) {
  try {
    const { itemName, description, category, dateLost, location, event: eventId } = req.body;
    if (!itemName?.trim()) {
      return res.status(400).json({ message: 'Item name is required' });
    }
    if (!(await ensureDailyPostBudget(res, req.user.id, 'lost'))) return;

    const dup = await assertNoDuplicateLost(req.user.id, itemName.trim(), location.trim());
    if (dup) {
      return res.status(409).json({
        message:
          'You already have an open "Looking" report for this item at this location. Update or close it first.',
        existingId: dup.publicId,
      });
    }

    let event = null;
    if (eventId) {
      const reg = await findConfirmedRegistration(req.user.id, eventId);
      if (!reg) {
        return res.status(400).json({
          message: 'You can only link an event you have a confirmed registration for.',
        });
      }
      event = eventId;
    }

    try {
      assertNotFutureDate(dateLost, 'Date lost');
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }

    const photo = req.file ? getPublicUploadPath(req.file.filename) : '';
    const doc = await LostItem.create({
      publicId: makePublicId('LF'),
      reporter: req.user.id,
      itemName: itemName.trim(),
      description: description || '',
      category: category.trim(),
      dateLost: new Date(dateLost),
      location: location.trim(),
      photo,
      event,
      status: 'Looking',
      isDeleted: false,
      hidden: false,
      moderationHidden: false,
      statusHistory: [{ status: 'Looking', note: 'Reported' }],
    });

    await doc.populate('reporter', 'name');
    res.status(201).json(serializeLost(doc));
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: formatValidationError(err) });
  }
}

export async function reportFound(req, res) {
  try {
    const { itemName, description, category, dateFound, location, event: eventId } = req.body;
    if (!itemName?.trim()) {
      return res.status(400).json({ message: 'Item name is required' });
    }
    if (!(await ensureDailyPostBudget(res, req.user.id, 'found'))) return;

    let event = null;
    if (eventId) {
      const reg = await findConfirmedRegistration(req.user.id, eventId);
      if (!reg) {
        return res.status(400).json({
          message: 'You can only link an event you have a confirmed registration for.',
        });
      }
      event = eventId;
    }

    try {
      assertNotFutureDate(dateFound, 'Date found');
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }
    const photo = req.file ? getPublicUploadPath(req.file.filename) : '';
    const doc = await FoundItem.create({
      publicId: makePublicId('FI'),
      finder: req.user.id,
      itemName: itemName.trim(),
      description: description || '',
      category: category.trim(),
      dateFound: new Date(dateFound),
      location: location.trim(),
      photo,
      event,
      status: 'Unclaimed',
      isDeleted: false,
      hidden: false,
      moderationHidden: false,
      statusHistory: [{ status: 'Unclaimed', note: 'Reported found' }],
    });

    await doc.populate('finder', 'name');
    res.status(201).json(serializeFound(doc));
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: formatValidationError(err) });
  }
}

export async function searchItems(req, res) {
  const { q, category, status, event, from, to, type } = req.query;

  const base = publicListingFilter();
  const lostFilter = { ...base };
  const foundFilter = { ...base };

  if (category) {
    lostFilter.category = new RegExp(category, 'i');
    foundFilter.category = new RegExp(category, 'i');
  }
  if (status) {
    lostFilter.status = status;
    foundFilter.status = status;
  }
  if (event) {
    lostFilter.event = event;
    foundFilter.event = event;
  }
  if (from || to) {
    const d = {};
    if (from) d.$gte = new Date(from);
    if (to) d.$lte = new Date(to);
    lostFilter.dateLost = d;
    foundFilter.dateFound = d;
  }
  if (q) {
    const rx = new RegExp(q, 'i');
    lostFilter.$or = [{ itemName: rx }, { description: rx }, { location: rx }];
    foundFilter.$or = [{ itemName: rx }, { description: rx }, { location: rx }];
  }

  let lost = [];
  let found = [];

  if (!type || type === 'lost') {
    lost = await LostItem.find(lostFilter)
      .populate('reporter', 'name email')
      .populate('event', 'title startDateTime')
      .sort({ createdAt: -1 })
      .limit(100);
  }
  if (!type || type === 'found') {
    found = await FoundItem.find(foundFilter)
      .populate('finder', 'name email')
      .populate('event', 'title startDateTime')
      .sort({ createdAt: -1 })
      .limit(100);
  }

  res.json({
    lost: lost.map((l) => ({ ...serializeLost(l), kind: 'lost' })),
    found: found.map((f) => ({ ...serializeFound(f), kind: 'found' })),
  });
}

export async function getLostById(req, res) {
  const doc = await LostItem.findById(req.params.id)
    .populate('event', 'title')
    .populate('reporter', 'name email shareContactInLostFound phone')
    .populate('matchedFoundItem', 'publicId itemName status');
  if (!doc || doc.isDeleted) return res.status(404).json({ message: 'Not found' });
  if (!viewerMaySeeLost(doc, req.user)) return res.status(404).json({ message: 'Not found' });
  res.json(serializeLost(doc));
}

export async function getFoundById(req, res) {
  const doc = await FoundItem.findById(req.params.id)
    .populate('event', 'title')
    .populate('finder', 'name email shareContactInLostFound phone')
    .populate('matchedLostItem', 'publicId itemName status');
  if (!doc || doc.isDeleted) return res.status(404).json({ message: 'Not found' });
  if (!viewerMaySeeFound(doc, req.user)) return res.status(404).json({ message: 'Not found' });
  res.json(serializeFound(doc));
}

/** Finder notifies lost owner (manual messaging). */
export async function notifyLostOwner(req, res) {
  const lost = await LostItem.findById(req.params.id).populate('reporter', 'name');
  if (!lost || lost.isDeleted || !viewerMaySeeLost(lost, req.user)) {
    return res.status(404).json({ message: 'Not found' });
  }
  if (lost.status !== 'Looking') {
    return res.status(400).json({ message: 'This listing is no longer open for tips' });
  }
  const ownerId = lost.reporter._id?.toString?.() || lost.reporter.toString();
  if (ownerId === req.user.id) {
    return res.status(400).json({ message: 'You cannot notify yourself on your own listing' });
  }

  const finder = await User.findById(req.user.id);
  const { message: userNote } = req.body;
  const footer = await buildContactFooter(req.user.id);
  const summary = `Item: "${lost.itemName}" (${lost.publicId}) at ${lost.location}.${userNote ? `\n\nTheir message:\n${userNote}` : ''}${footer}`;

  const link = `/messages?lost=${lost._id}&with=${req.user.id}`;
  await notifyUser(
    ownerId,
    `${finder.name} may have found your item`,
    `${finder.name} reached out about your lost item.\n${summary}`,
    link,
    { kind: 'lost_tip', lostItem: lost._id, fromUser: req.user.id }
  );

  const bodyText =
    userNote?.trim() ||
    `${finder.name} thinks they may have found your item "${lost.itemName}" (${lost.publicId}). Check Messages to reply.${footer ? `\n${footer}` : ''}`;

  await Message.create({
    sender: req.user.id,
    receiver: ownerId,
    text: bodyText.trim(),
    lostItemId: lost._id,
  });

  res.status(201).json({ message: 'Owner notified' });
}

/**
 * Someone who believes the found item is theirs notifies the finder (claim flow).
 * Enforces rolling 24h claim limit; records {@link FoundItemClaim}.
 */
async function submitFoundItemClaim(req, res, foundMongoId) {
  try {
    const maxClaims = maxFoundClaimsPer24h();
    const since = rolling24hStart();
    const claimCount = await FoundItemClaim.countDocuments({
      user: req.user.id,
      createdAt: { $gte: since },
    });
    if (claimCount >= maxClaims) {
      return res.status(400).json({ message: claimLimitMessage(maxClaims) });
    }

    const found = await FoundItem.findById(foundMongoId).populate('finder', 'name');
    if (!found || found.isDeleted || !viewerMaySeeFound(found, req.user)) {
      return res.status(404).json({ message: 'Not found' });
    }
    if (found.status !== 'Unclaimed') {
      return res
        .status(400)
        .json({ message: 'This listing cannot receive owner tips in its current state' });
    }
    const finderId = found.finder._id?.toString?.() || found.finder.toString();
    if (finderId === req.user.id) {
      return res.status(400).json({ message: 'You cannot notify yourself on your own listing' });
    }

    const sender = await User.findById(req.user.id);
    const { message: userNote } = req.body;
    const footer = await buildContactFooter(req.user.id);
    const summary = `Found item: "${found.itemName}" (${found.publicId}).${userNote ? `\n\nTheir message:\n${userNote}` : ''}${footer}`;

    const link = `/messages?found=${found._id}&with=${req.user.id}`;
    await notifyUser(
      finderId,
      `${sender.name} says this may be their item`,
      `${sender.name} contacted you about an item you found.\n${summary}`,
      link,
      { kind: 'found_tip', foundItem: found._id, fromUser: req.user.id }
    );

    const bodyText =
      userNote?.trim() ||
      `${sender.name} believes the item you found "${found.itemName}" (${found.publicId}) may belong to them. Reply in Messages.${footer ? `\n${footer}` : ''}`;

    await Message.create({
      sender: req.user.id,
      receiver: finderId,
      text: bodyText.trim(),
      foundItemId: found._id,
    });

    await FoundItemClaim.create({ user: req.user.id, foundItem: found._id });

    res.status(201).json({ message: 'Finder notified' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Could not submit claim' });
  }
}

/** Legacy route: POST /lost-found/found/:id/notify-finder */
export async function notifyFoundFinder(req, res) {
  return submitFoundItemClaim(req, res, req.params.id);
}

/** POST /api/claims — same as notify-finder with body.foundItemId */
export async function createClaim(req, res) {
  const { foundItemId } = req.body;
  if (!foundItemId) {
    return res.status(400).json({ message: 'foundItemId is required' });
  }
  return submitFoundItemClaim(req, res, foundItemId);
}

export async function listMyLostFound(req, res) {
  const uid = req.user.id;
  const lost = await LostItem.find({ reporter: uid, isDeleted: notDeleted })
    .populate('reporter', 'name')
    .populate('event', 'title')
    .sort({ createdAt: -1 });
  const found = await FoundItem.find({ finder: uid, isDeleted: notDeleted })
    .populate('finder', 'name')
    .populate('event', 'title')
    .sort({ createdAt: -1 });
  res.json({
    lost: lost.map(serializeLost),
    foundPosted: found.map(serializeFound),
  });
}

export async function updateMyLost(req, res) {
  const doc = await LostItem.findOne({
    _id: req.params.id,
    reporter: req.user.id,
    isDeleted: notDeleted,
  });
  if (!doc) return res.status(404).json({ message: 'Lost report not found' });
  if (doc.status !== 'Looking') {
    return res.status(400).json({ message: 'You can only edit reports that are still "Looking"' });
  }

  const { description, location, category, dateLost } = req.body;
  if (description != null) doc.description = description;
  if (location != null) doc.location = location.trim();
  if (category != null) doc.category = category.trim();
  if (dateLost != null) {
    try {
      assertNotFutureDate(dateLost, 'Date lost');
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }
    doc.dateLost = new Date(dateLost);
  }
  if (req.file) doc.photo = getPublicUploadPath(req.file.filename);

  try {
    await doc.save();
  } catch (err) {
    return res.status(400).json({ message: formatValidationError(err) });
  }
  await doc.populate('reporter', 'name');
  res.json(serializeLost(doc));
}

export async function updateMyFound(req, res) {
  const doc = await FoundItem.findOne({
    _id: req.params.id,
    finder: req.user.id,
    isDeleted: notDeleted,
  });
  if (!doc) return res.status(404).json({ message: 'Found report not found' });
  if (doc.status !== 'Unclaimed') {
    return res.status(400).json({ message: 'You can only edit listings that are still "Unclaimed"' });
  }

  const { description, location, category, dateFound } = req.body;
  if (description != null) doc.description = description;
  if (location != null) doc.location = location.trim();
  if (category != null) doc.category = category.trim();
  if (dateFound != null) {
    try {
      assertNotFutureDate(dateFound, 'Date found');
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }
    doc.dateFound = new Date(dateFound);
  }
  if (req.file) doc.photo = getPublicUploadPath(req.file.filename);

  try {
    await doc.save();
  } catch (err) {
    return res.status(400).json({ message: formatValidationError(err) });
  }
  await doc.populate('finder', 'name');
  res.json(serializeFound(doc));
}

export async function deleteMyLost(req, res) {
  const doc = await LostItem.findOne({
    _id: req.params.id,
    reporter: req.user.id,
    isDeleted: notDeleted,
  });
  if (!doc) return res.status(404).json({ message: 'Lost report not found' });
  if (doc.status !== 'Looking' || doc.matchedFoundItem) {
    return res.status(400).json({ message: 'Only open listings without a match can be removed' });
  }

  doc.isDeleted = true;
  pushHistory(doc, doc.status, 'Soft-deleted by reporter');
  await doc.save();
  res.json({ message: 'Removed', id: doc._id });
}

export async function deleteMyFound(req, res) {
  const doc = await FoundItem.findOne({
    _id: req.params.id,
    finder: req.user.id,
    isDeleted: notDeleted,
  });
  if (!doc) return res.status(404).json({ message: 'Found listing not found' });
  if (doc.status !== 'Unclaimed') {
    return res.status(400).json({ message: 'Only unclaimed listings can be deleted' });
  }

  doc.isDeleted = true;
  pushHistory(doc, doc.status, 'Soft-deleted by finder');
  await doc.save();
  res.json({ message: 'Removed', id: doc._id });
}

/** PATCH body: { status: 'FoundByOwner' | 'Resolved' } — reporter only */
export async function patchMyLostStatus(req, res) {
  const { status } = req.body;
  const doc = await LostItem.findOne({
    _id: req.params.id,
    reporter: req.user.id,
    isDeleted: notDeleted,
  });
  if (!doc) return res.status(404).json({ message: 'Lost report not found' });

  if (status === 'FoundByOwner') {
    if (doc.status !== 'Looking') {
      return res.status(400).json({ message: 'Only "Looking" reports can be marked found by you' });
    }
    doc.status = 'FoundByOwner';
    pushHistory(doc, 'FoundByOwner', 'Marked found by owner');
  } else if (status === 'Resolved') {
    if (doc.status !== 'FoundByOwner') {
      return res
        .status(400)
        .json({ message: 'Mark the item as found by you before marking it resolved' });
    }
    doc.status = 'Resolved';
    pushHistory(doc, 'Resolved', 'Marked resolved by owner');
  } else {
    return res.status(400).json({ message: 'Invalid status. Use FoundByOwner or Resolved.' });
  }

  await doc.save();
  await doc.populate('reporter', 'name');
  res.json(serializeLost(doc));
}

/** PATCH body: { status: 'Claimed' | 'Resolved' } — finder only */
export async function patchMyFoundStatus(req, res) {
  const { status } = req.body;
  const doc = await FoundItem.findOne({
    _id: req.params.id,
    finder: req.user.id,
    isDeleted: notDeleted,
  });
  if (!doc) return res.status(404).json({ message: 'Found listing not found' });

  if (status === 'Claimed') {
    if (doc.status !== 'Unclaimed') {
      return res.status(400).json({ message: 'Only unclaimed listings can be marked claimed' });
    }
    doc.status = 'Claimed';
    pushHistory(doc, 'Claimed', 'Marked claimed (handed over)');
  } else if (status === 'Resolved') {
    if (doc.status !== 'Claimed') {
      return res.status(400).json({ message: 'Mark as claimed before resolving' });
    }
    doc.status = 'Resolved';
    pushHistory(doc, 'Resolved', 'Marked resolved by finder');
  } else {
    return res.status(400).json({ message: 'Invalid status. Use Claimed or Resolved.' });
  }

  await doc.save();
  await doc.populate('finder', 'name');
  res.json(serializeFound(doc));
}

/* ——— Admin: moderation only ——— */

export async function listAdminModerationQueue(req, res) {
  const lost = await LostItem.find({ isDeleted: notDeleted })
    .populate('reporter', 'name email')
    .sort({ updatedAt: -1 })
    .limit(150);
  const found = await FoundItem.find({ isDeleted: notDeleted })
    .populate('finder', 'name email')
    .sort({ updatedAt: -1 })
    .limit(150);
  res.json({
    lost: lost.map(serializeLost),
    found: found.map(serializeFound),
  });
}

export async function setLostModeration(req, res) {
  const doc = await LostItem.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  const hidden = Boolean(req.body.hidden ?? req.body.moderationHidden);
  doc.hidden = hidden;
  doc.moderationHidden = hidden;
  pushHistory(doc, doc.status, hidden ? 'Hidden by moderator' : 'Restored visibility by moderator');
  await doc.save();
  await notifyUser(
    doc.reporter,
    'Lost listing visibility updated',
    hidden
      ? `Your lost report "${doc.itemName}" (${doc.publicId}) was hidden from public search by a moderator. You can still manage it from your dashboard.`
      : `Your lost report "${doc.itemName}" (${doc.publicId}) is visible in public search again.`,
    '/dashboard'
  );
  await doc.populate('reporter', 'name email');
  res.json(serializeLost(doc));
}

export async function setFoundModeration(req, res) {
  const doc = await FoundItem.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  const hidden = Boolean(req.body.hidden ?? req.body.moderationHidden);
  doc.hidden = hidden;
  doc.moderationHidden = hidden;
  pushHistory(doc, doc.status, hidden ? 'Hidden by moderator' : 'Restored visibility by moderator');
  await doc.save();
  await notifyUser(
    doc.finder,
    'Found listing visibility updated',
    hidden
      ? `Your found listing "${doc.itemName}" (${doc.publicId}) was hidden from public search by a moderator. You can still manage it from your dashboard.`
      : `Your found listing "${doc.itemName}" (${doc.publicId}) is visible in public search again.`,
    '/dashboard'
  );
  await doc.populate('finder', 'name email');
  res.json(serializeFound(doc));
}

/** Lost or found rows hidden from public (`hidden` or legacy `moderationHidden`). */
function hiddenListingFilter() {
  return {
    isDeleted: notDeleted,
    $or: [{ hidden: true }, { moderationHidden: true }],
  };
}

/**
 * GET /api/lost-found/admin/hidden — hidden listings only, merged sort (newest first), paginated.
 */
export async function listAdminHiddenLostFound(req, res) {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
    const sortField = req.query.sort === 'createdAt' ? 'createdAt' : 'updatedAt';

    const [lost, found] = await Promise.all([
      LostItem.find(hiddenListingFilter())
        .populate('reporter', 'name email')
        .sort({ [sortField]: -1 })
        .limit(500)
        .lean(),
      FoundItem.find(hiddenListingFilter())
        .populate('finder', 'name email')
        .sort({ [sortField]: -1 })
        .limit(500)
        .lean(),
    ]);

    const items = [
      ...lost.map((d) => ({ ...d, kind: 'lost' })),
      ...found.map((d) => ({ ...d, kind: 'found' })),
    ].sort((a, b) => new Date(b[sortField]) - new Date(a[sortField]));

    const total = items.length;
    const start = (page - 1) * limit;
    const pageItems = items
      .slice(start, start + limit)
      .map((row) => (row.kind === 'lost' ? serializeLost(row) : serializeFound(row)));

    res.json({
      items: pageItems,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      sort: sortField,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load hidden listings' });
  }
}

/**
 * DELETE /api/lost-found/admin/:type/:id — permanent delete (hard) only if listing is hidden.
 * Cleans messages, notifications, and peer match references.
 */
export async function adminPermanentlyDeleteHidden(req, res) {
  try {
    const { type, id } = req.params;
    if (type !== 'lost' && type !== 'found') {
      return res.status(400).json({ message: 'type must be "lost" or "found"' });
    }
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const Model = type === 'lost' ? LostItem : FoundItem;
    const doc = await Model.findById(id);
    if (!doc) return res.status(404).json({ message: 'Listing not found' });
    if (!listingHidden(doc)) {
      return res.status(400).json({
        message: 'Only hidden listings can be permanently deleted. Hide the listing first.',
      });
    }

    const posterId = type === 'lost' ? doc.reporter : doc.finder;
    const itemName = doc.itemName;

    if (type === 'lost') {
      await Message.deleteMany({
        $or: [{ lostItemId: id }, { relatedLostItem: id }],
      });
      await Notification.deleteMany({ 'meta.lostItem': id });
      await FoundItem.updateMany({ matchedLostItem: id }, { $set: { matchedLostItem: null } });
      await LostItem.findByIdAndDelete(id);
    } else {
      await Message.deleteMany({
        $or: [{ foundItemId: id }, { relatedFoundItem: id }],
      });
      await Notification.deleteMany({ 'meta.foundItem': id });
      await LostItem.updateMany({ matchedFoundItem: id }, { $set: { matchedFoundItem: null } });
      await FoundItem.findByIdAndDelete(id);
    }

    const typeLabel = type === 'lost' ? 'lost' : 'found';
    await notifyUser(
      posterId,
      'Listing removed by moderator',
      `Your ${typeLabel} item "${itemName}" was removed by admin because it violated community guidelines.`,
      '/dashboard',
      {
        kind: 'admin_removed_item',
        relatedItemId: id,
        relatedItemType: type,
        lostItem: type === 'lost' ? id : null,
        foundItem: type === 'found' ? id : null,
      }
    );

    res.json({ message: 'Listing permanently deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Delete failed' });
  }
}
