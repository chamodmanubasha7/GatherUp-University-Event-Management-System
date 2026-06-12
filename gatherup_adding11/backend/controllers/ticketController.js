import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';
import TicketUsageLog from '../models/TicketUsageLog.js';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import { verifyTicketPayload } from '../utils/ticketCrypto.js';

/** IDs of tickets matching admin cleanup: used QR, or event already ended. */
async function findTicketIdsForAdminCleanup(now = new Date()) {
  const expiredEventIds = await Event.find({ endDateTime: { $lt: now } }).distinct('_id');
  const tickets = await Ticket.find({
    $or: [{ status: 'used' }, { eventId: { $in: expiredEventIds } }],
  })
    .select('_id registration')
    .lean();

  const ticketIds = tickets.map((t) => t._id);
  const registrationIds = [...new Set(tickets.map((t) => t.registration).filter(Boolean))];
  return { ticketIds, registrationIds };
}

async function hardDeleteTicketsAndRegistrations(ticketIds, registrationIds, session = null) {
  if (ticketIds.length === 0) {
    return { deletedTickets: 0, deletedRegistrations: 0 };
  }
  const opts = session ? { session } : {};
  const t = await Ticket.deleteMany({ _id: { $in: ticketIds } }, opts);
  const r = await Registration.deleteMany({ _id: { $in: registrationIds } }, opts);
  return { deletedTickets: t.deletedCount ?? 0, deletedRegistrations: r.deletedCount ?? 0 };
}

/**
 * DELETE /api/tickets/cleanup — admin; removes used tickets and tickets for ended events (+ registrations).
 * Uses a transaction when the deployment supports it; otherwise deletes without a transaction.
 */
export async function cleanupTicketsAdmin(req, res) {
  try {
    const now = new Date();
    const { ticketIds, registrationIds } = await findTicketIdsForAdminCleanup(now);

    if (ticketIds.length === 0) {
      return res.json({ deletedTickets: 0, deletedRegistrations: 0, message: 'Nothing to clean up.' });
    }

    let deletedTickets = 0;
    let deletedRegistrations = 0;

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const result = await hardDeleteTicketsAndRegistrations(ticketIds, registrationIds, session);
        deletedTickets = result.deletedTickets;
        deletedRegistrations = result.deletedRegistrations;
      });
    } catch (txErr) {
      console.warn('[tickets/cleanup] transaction failed, using non-transactional delete:', txErr.message);
      const result = await hardDeleteTicketsAndRegistrations(ticketIds, registrationIds, null);
      deletedTickets = result.deletedTickets;
      deletedRegistrations = result.deletedRegistrations;
    } finally {
      await session.endSession();
    }

    res.json({
      deletedTickets,
      deletedRegistrations,
      message: `Removed ${deletedTickets} ticket(s) and ${deletedRegistrations} registration(s).`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Cleanup failed' });
  }
}

/**
 * DELETE /api/tickets/mine/expired — current user's tickets for events that have ended (+ registrations).
 */
export async function deleteMyExpiredTickets(req, res) {
  try {
    const now = new Date();
    const userId = req.user.id;
    const expiredEventIds = await Event.find({ endDateTime: { $lt: now } }).distinct('_id');
    const tickets = await Ticket.find({
      userId,
      eventId: { $in: expiredEventIds },
    })
      .select('_id registration')
      .lean();

    const ticketIds = tickets.map((t) => t._id);
    const registrationIds = [...new Set(tickets.map((t) => t.registration).filter(Boolean))];

    if (ticketIds.length === 0) {
      return res.json({
        deletedTickets: 0,
        deletedRegistrations: 0,
        message: 'No expired tickets to remove.',
      });
    }

    const session = await mongoose.startSession();
    let deletedTickets = 0;
    let deletedRegistrations = 0;
    try {
      await session.withTransaction(async () => {
        const result = await hardDeleteTicketsAndRegistrations(ticketIds, registrationIds, session);
        deletedTickets = result.deletedTickets;
        deletedRegistrations = result.deletedRegistrations;
      });
    } catch (txErr) {
      console.warn('[tickets/mine/expired] transaction failed, using non-transactional delete:', txErr.message);
      const result = await hardDeleteTicketsAndRegistrations(ticketIds, registrationIds, null);
      deletedTickets = result.deletedTickets;
      deletedRegistrations = result.deletedRegistrations;
    } finally {
      await session.endSession();
    }

    res.json({
      deletedTickets,
      deletedRegistrations,
      message: `Removed ${deletedTickets} ticket(s) and ${deletedRegistrations} registration(s).`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Could not remove expired tickets' });
  }
}

/**
 * DELETE /api/tickets/mine/:ticketId — one ticket only if the event has ended (same as bulk user cleanup).
 */
export async function deleteMyTicketIfExpired(req, res) {
  try {
    const { ticketId } = req.params;
    if (!mongoose.isValidObjectId(ticketId)) {
      return res.status(400).json({ message: 'Invalid ticket id' });
    }
    const now = new Date();
    const ticket = await Ticket.findOne({ _id: ticketId, userId: req.user.id }).populate('eventId', 'endDateTime');
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    const ev = ticket.eventId;
    if (!ev || typeof ev.endDateTime === 'undefined') {
      return res.status(400).json({ message: 'Cannot verify event for this ticket.' });
    }
    if (new Date(ev.endDateTime) >= now) {
      return res.status(400).json({
        message: 'You can only remove tickets for events that have already ended.',
      });
    }
    const regId = ticket.registration;

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Ticket.deleteOne({ _id: ticket._id }, { session });
        if (regId) await Registration.deleteOne({ _id: regId }, { session });
      });
    } catch (txErr) {
      console.warn('[tickets/mine/:id] transaction failed:', txErr.message);
      await Ticket.deleteOne({ _id: ticket._id });
      if (regId) await Registration.deleteOne({ _id: regId });
    } finally {
      await session.endSession();
    }

    res.json({ deletedTickets: 1, deletedRegistrations: regId ? 1 : 0, message: 'Ticket removed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Could not remove ticket' });
  }
}

function isUuidShape(id) {
  return id && typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id);
}

/**
 * GET /api/tickets/mine — all tickets for current user with populated event (+ venue).
 */
export async function listMyTickets(req, res) {
  try {
    const tickets = await Ticket.find({ userId: req.user.id })
      .populate({
        path: 'eventId',
        select: 'title startDateTime endDateTime',
        populate: { path: 'venue', select: 'name location' },
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load tickets' });
  }
}

/**
 * POST /api/tickets/scan — admin-only; raw QR string is JSON with ticketId, eventId, userId, issuedAt, sig.
 */
export async function scanTicket(req, res) {
  const { raw } = req.body;
  if (!raw || typeof raw !== 'string') {
    return res.status(400).json({ message: 'Missing QR payload' });
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return res.status(400).json({ message: 'Invalid QR code format' });
  }

  const { ticketId, eventId, userId, issuedAt, sig } = parsed;

  if (!isUuidShape(ticketId) || !eventId || !userId || !issuedAt || !sig) {
    return res.status(400).json({ message: 'QR data incomplete or invalid' });
  }

  const bodyForVerify = {
    ticketId: String(ticketId),
    eventId: String(eventId),
    userId: String(userId),
    issuedAt: String(issuedAt),
  };

  if (!verifyTicketPayload(bodyForVerify, sig)) {
    return res.status(400).json({ message: 'Invalid ticket signature — possible tampering' });
  }

  try {
    const ticket = await Ticket.findById(ticketId)
      .populate('userId', 'name email')
      .populate({ path: 'eventId', populate: { path: 'venue', select: 'name location' } });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    if (!ticket.eventId || !ticket.userId) {
      return res.status(400).json({ message: 'Ticket data is corrupted' });
    }

    if (ticket.eventId._id.toString() !== bodyForVerify.eventId) {
      return res.status(400).json({ message: 'Ticket data does not match records' });
    }
    if (ticket.userId._id.toString() !== bodyForVerify.userId) {
      return res.status(400).json({ message: 'Ticket data does not match records' });
    }

    const reg = await Registration.findOne({
      _id: ticket.registration,
      user: ticket.userId._id,
      event: ticket.eventId._id,
    });
    if (!reg) {
      return res.status(400).json({ message: 'No valid registration for this ticket' });
    }

    const event = ticket.eventId;
    const now = new Date();
    if (now < new Date(event.startDateTime) || now > new Date(event.endDateTime)) {
      return res.status(400).json({
        message: 'Check-in is only allowed during the event time window',
        eventTitle: event.title,
        start: event.startDateTime,
        end: event.endDateTime,
      });
    }

    if (ticket.status === 'used') {
      return res.status(409).json({
        message: 'This ticket was already used',
        usedAt: ticket.usedAt,
      });
    }

    ticket.status = 'used';
    ticket.usedAt = now;
    await ticket.save();

    try {
      await TicketUsageLog.create({
        eventId: event._id,
        userId: ticket.userId._id,
        ticketId: ticket._id,
        scannedAt: now,
        scannedBy: req.user.id,
      });
    } catch (logErr) {
      console.error('[tickets/scan] TicketUsageLog create failed:', logErr.message);
    }

    res.json({
      success: true,
      message: 'Ticket validated — attendance recorded',
      ticket: {
        id: ticket._id,
        status: ticket.status,
        usedAt: ticket.usedAt,
      },
      attendee: ticket.userId,
      event: { title: event.title, id: event._id },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Check-in failed. Please try again.' });
  }
}

/**
 * GET /api/tickets/usage-logs?eventId= — admin; successful scans, newest first.
 */
export async function listTicketUsageLogs(req, res) {
  try {
    const { eventId } = req.query;
    const filter = {};
    if (eventId && mongoose.isValidObjectId(String(eventId))) {
      filter.eventId = eventId;
    }

    const logs = await TicketUsageLog.find(filter)
      .populate('eventId', 'title')
      .populate('userId', 'name email')
      .populate('ticketId', 'status')
      .populate('scannedBy', 'name email')
      .sort({ scannedAt: -1 })
      .limit(500)
      .lean();

    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load usage logs' });
  }
}

export async function eventAttendanceReport(req, res) {
  const { eventId } = req.params;
  const event = await Event.findById(eventId);
  if (!event) return res.status(404).json({ message: 'Event not found' });

  const totalReg = await Registration.countDocuments({ event: eventId });
  const used = await Ticket.countDocuments({ eventId, status: 'used' });
  const rate = totalReg > 0 ? Math.round((used / totalReg) * 1000) / 10 : 0;

  res.json({
    eventId,
    title: event.title,
    totalRegistrations: totalReg,
    ticketsUsed: used,
    attendanceRatePercent: rate,
  });
}
