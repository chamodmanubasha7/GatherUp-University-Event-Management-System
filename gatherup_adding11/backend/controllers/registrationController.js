import mongoose from 'mongoose';
import Registration from '../models/Registration.js';
import Ticket from '../models/Ticket.js';
import Event from '../models/Event.js';
import Payment from '../models/Payment.js';
import { intervalsOverlap } from '../utils/eventOverlap.js';
import { signTicketPayload } from '../utils/ticketCrypto.js';
import QRCode from 'qrcode';

function normalizePaymentDetails(method, rawDetails = {}) {
  if (method === 'card') {
    const digits = String(rawDetails.cardNumber || rawDetails.cardLast4 || '').replace(/\D/g, '');
    return {
      cardName: String(rawDetails.cardName || '').trim(),
      cardLast4: digits.slice(-4),
      cardExpiry: String(rawDetails.cardExpiry || rawDetails.expiry || '').trim(),
      bankName: '',
      accountHolder: '',
      accountNumberLast4: '',
      upiId: '',
      provider: String(rawDetails.provider || '').trim(),
      referenceNote: String(rawDetails.referenceNote || '').trim(),
    };
  }

  if (method === 'netbanking') {
    const accountDigits = String(rawDetails.accountNumber || rawDetails.accountNumberLast4 || '').replace(
      /\D/g,
      ''
    );
    return {
      cardName: '',
      cardLast4: '',
      cardExpiry: '',
      bankName: String(rawDetails.bankName || '').trim(),
      accountHolder: String(rawDetails.accountHolder || '').trim(),
      accountNumberLast4: accountDigits.slice(-4),
      upiId: '',
      provider: String(rawDetails.provider || '').trim(),
      referenceNote: String(rawDetails.referenceNote || '').trim(),
    };
  }

  if (method === 'upi') {
    return {
      cardName: '',
      cardLast4: '',
      cardExpiry: '',
      bankName: '',
      accountHolder: String(rawDetails.accountHolder || '').trim(),
      accountNumberLast4: '',
      upiId: String(rawDetails.upiId || '').trim(),
      provider: String(rawDetails.provider || '').trim(),
      referenceNote: String(rawDetails.referenceNote || '').trim(),
    };
  }

  return {
    cardName: '',
    cardLast4: '',
    cardExpiry: '',
    bankName: '',
    accountHolder: String(rawDetails.accountHolder || '').trim(),
    accountNumberLast4: '',
    upiId: '',
    provider: String(rawDetails.provider || '').trim(),
    referenceNote: String(rawDetails.referenceNote || '').trim(),
  };
}

function validatePaymentDetails(method, paymentDetails) {
  if (method === 'card' && !paymentDetails.cardLast4) {
    return 'Card details are required for card payments';
  }

  if (method === 'netbanking' && (!paymentDetails.bankName || !paymentDetails.accountHolder)) {
    return 'Bank name and account holder are required for net banking';
  }

  if (method === 'upi' && !paymentDetails.upiId) {
    return 'UPI ID is required for UPI payments';
  }

  return '';
}

async function validateRegistrationEligibility(eventId, userId) {
  const event = await Event.findById(eventId).populate('venue');
  if (!event) {
    return { error: { status: 404, message: 'Event not found' } };
  }
  if (!event.venue) {
    return { error: { status: 400, message: 'Event has no venue' } };
  }

  const currentCount = await Registration.countDocuments({ event: eventId });
  if (currentCount >= event.capacity) {
    return {
      error: {
        status: 400,
        message: 'Event capacity has been reached. No more registrations are accepted.',
      },
    };
  }

  const existing = await Registration.findOne({ user: userId, event: eventId });
  if (existing) {
    return { error: { status: 409, message: 'You are already registered for this event' } };
  }

  const myRegs = await Registration.find({ user: userId }).populate({
    path: 'event',
    select: 'startDateTime endDateTime title venue',
  });
  for (const r of myRegs) {
    if (!r.event) continue;
    if (
      intervalsOverlap(
        r.event.startDateTime,
        r.event.endDateTime,
        event.startDateTime,
        event.endDateTime
      )
    ) {
      return {
        error: {
          status: 400,
          message: `Time conflict: you are already registered for "${r.event.title}" which overlaps this event.`,
        },
      };
    }
  }

  const venueEvents = await Event.find({
    venue: event.venue._id,
    _id: { $ne: event._id },
  });
  for (const other of venueEvents) {
    if (
      intervalsOverlap(
        other.startDateTime,
        other.endDateTime,
        event.startDateTime,
        event.endDateTime
      )
    ) {
      return {
        error: {
          status: 400,
          message:
            'This venue is already booked for another event during this time. Registration is blocked.',
        },
      };
    }
  }

  return { event };
}

async function createRegistrationAndTicket(event, userId, ticketTier = null) {
  let registration = null;

  try {
    registration = await Registration.create({
      user: userId,
      event: event._id,
      ticketTier,
      confirmed: true,
    });

    const ticketMongoId = new mongoose.Types.ObjectId();
    const ticketId = ticketMongoId.toString();
    const payloadForSign = {
      ticketId,
      eventId: String(registration.event),
      userId: String(registration.user),
      issuedAt: new Date().toISOString(),
    };

    const { signature } = signTicketPayload(payloadForSign);
    const payloadWithSig = { ...payloadForSign, sig: signature };
    const qrData = JSON.stringify(payloadWithSig);
    const qrCode = await QRCode.toDataURL(qrData, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    const ticket = await Ticket.create({
      _id: ticketMongoId,
      registration: registration._id,
      eventId: registration.event,
      userId: registration.user,
      qrData,
      qrCode,
      status: 'unused',
    });

    return {
      registration,
      ticketDoc: ticket,
      ticket: {
        id: ticket._id,
        ticketId,
        status: 'unused',
        qrData,
        qrCode,
      },
    };
  } catch (err) {
    if (registration?._id) {
      await Ticket.deleteMany({ registration: registration._id }).catch(() => {});
      await Registration.deleteOne({ _id: registration._id }).catch(() => {});
    }
    throw err;
  }
}

export async function registerForEvent(req, res) {
  const { eventId } = req.params;
  const userId = req.user.id;

  try {
    const { event, error } = await validateRegistrationEligibility(eventId, userId);
    if (error) return res.status(error.status).json({ message: error.message });

    const result = await createRegistrationAndTicket(event, userId);
    res.status(201).json({
      registration: result.registration,
      ticket: result.ticket,
    });
  } catch (err) {
    console.error(err);
    const message =
      err.name === 'ValidationError'
        ? Object.values(err.errors || {})
            .map((e) => e.message)
            .join(', ') || err.message
        : err.message || 'Registration failed';
    res.status(400).json({ message });
  }
}

export async function purchaseTicketForEvent(req, res) {
  const { eventId } = req.params;
  const userId = req.user.id;
  const { method = 'card', transactionId = '', notes = '', paymentDetails: rawDetails = {}, ticketTier = null } = req.body;
  let payment = null;

  try {
    const { event, error } = await validateRegistrationEligibility(eventId, userId);
    if (error) return res.status(error.status).json({ message: error.message });

    const paymentDetails = normalizePaymentDetails(method, rawDetails);
    const validationError = validatePaymentDetails(method, paymentDetails);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    let amount = Number(event.ticketPrice || 0);
    if (ticketTier && event.ticketTiers && event.ticketTiers.length > 0) {
      const tier = event.ticketTiers.find((t) => t.name === ticketTier);
      if (tier) amount = Number(tier.price || 0);
    }

    payment = await Payment.create({
      userId,
      eventId: event._id,
      eventName: event.title,
      amount,
      method,
      transactionId: transactionId || `TXN-${Date.now()}`,
      notes,
      paymentDetails,
      status: 'completed',
    });

    const result = await createRegistrationAndTicket(event, userId, ticketTier);
    payment.registrationId = result.registration._id;
    payment.ticketId = result.ticketDoc._id;
    await payment.save();

    res.status(201).json({
      message: 'Payment completed and ticket created',
      event: {
        id: event._id,
        title: event.title,
        ticketPrice: Number(event.ticketPrice || 0),
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        venue: event.venue
          ? {
              id: event.venue._id,
              name: event.venue.name,
              location: event.venue.location,
            }
          : null,
      },
      payment,
      registration: result.registration,
      ticket: result.ticket,
    });
  } catch (err) {
    if (payment?._id) {
      if (payment.registrationId) {
        await Ticket.deleteMany({ _id: payment.ticketId }).catch(() => {});
        await Registration.deleteOne({ _id: payment.registrationId }).catch(() => {});
      }
      await Payment.deleteOne({ _id: payment._id }).catch(() => {});
    }
    console.error(err);
    res.status(400).json({ message: err.message || 'Could not complete ticket purchase' });
  }
}

export async function cancelRegistration(req, res) {
  const { eventId } = req.params;
  const userId = req.user.id;
  const reg = await Registration.findOne({ user: userId, event: eventId });
  if (!reg) {
    return res.status(404).json({ message: 'Registration not found' });
  }
  const event = await Event.findById(eventId);
  if (event && new Date(event.startDateTime) <= new Date()) {
    return res.status(400).json({
      message: 'Cannot unregister: this event has already started or ended.',
    });
  }
  await Ticket.deleteMany({ registration: reg._id });
  await reg.deleteOne();
  res.json({ message: 'Registration cancelled and ticket removed' });
}

export async function listMyRegistrations(req, res) {
  const userId = req.user.id;
  const regs = await Registration.find({ user: userId })
    .populate({
      path: 'event',
      populate: [{ path: 'venue' }, { path: 'category', select: 'name' }],
    })
    .sort({ registeredAt: -1 });

  const tickets = await Ticket.find({
    registration: { $in: regs.map((r) => r._id) },
  });

  const byReg = Object.fromEntries(tickets.map((t) => [t.registration.toString(), t]));

  const out = [];
  for (const r of regs) {
    const t = byReg[r._id.toString()];
    out.push({
      registration: r,
      ticket: t
        ? {
            id: t._id,
            status: t.status,
            qrData: t.qrData,
            qrCode: t.qrCode,
            usedAt: t.usedAt,
          }
        : null,
    });
  }
  res.json(out);
}
