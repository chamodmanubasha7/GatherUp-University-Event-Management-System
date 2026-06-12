import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import Ticket from '../models/Ticket.js';
import Feedback from '../models/Feedback.js';
import Notification from '../models/Notification.js';
import { getPublicUploadPath } from '../middleware/upload.js';
import { assertVenueAvailable } from '../utils/venueBooking.js';
import User from '../models/User.js';
import { sendMail } from '../utils/email.js';
import ExcelJS from 'exceljs';

const UPDATED_FIELD_WHITELIST = [
  'title',
  'description',
  'category',
  'venue',
  'startDateTime',
  'endDateTime',
  'capacity',
  'ticketPrice',
  'locationType',
  'ticketingType',
  'ticketTiers',
  'image',
  'video',
  'pdf',
  'link',
];

function localDayBounds(dateLike) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return { start, end };
}

function fmtLocalDay(dateLike) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isSameInstant(a, b) {
  const da = a instanceof Date ? a : a ? new Date(a) : null;
  const db = b instanceof Date ? b : b ? new Date(b) : null;
  if (!da && !db) return true;
  if (!da || !db) return false;
  return da.getTime() === db.getTime();
}

function computeUpdatedFields(current, update) {
  const changed = [];
  for (const k of UPDATED_FIELD_WHITELIST) {
    if (!(k in update)) continue;
    if (k === 'startDateTime' || k === 'endDateTime') {
      if (!isSameInstant(current[k], update[k])) changed.push(k);
      continue;
    }
    if (String(current[k] ?? '') !== String(update[k] ?? '')) changed.push(k);
  }
  return changed;
}

export async function listEvents(req, res) {
  const { category, from, to, search } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (from || to) {
    filter.startDateTime = {};
    if (from) filter.startDateTime.$gte = new Date(from);
    if (to) filter.startDateTime.$lte = new Date(to);
  }
  if (search) {
    filter.$or = [
      { title: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
    ];
  }
  const events = await Event.find(filter)
    .populate('category', 'name')
    .populate('venue', 'name location capacity')
    .populate('createdBy', 'name email')
    .sort({ startDateTime: 1 });

  const counts = await Registration.aggregate([
    { $group: { _id: '$event', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));

  let preferredLocationType = null;
  if (req.user) {
    const userRegistrations = await Registration.find({ user: req.user.id }).populate('event', 'locationType');
    let indoorCount = 0;
    let outdoorCount = 0;
    for (const reg of userRegistrations) {
      if (reg.event?.locationType === 'Indoor') indoorCount++;
      if (reg.event?.locationType === 'Outdoor') outdoorCount++;
    }
    if (indoorCount > outdoorCount) preferredLocationType = 'Indoor';
    else if (outdoorCount > indoorCount) preferredLocationType = 'Outdoor';
  }

  const feedbackStats = await Feedback.aggregate([
    { $group: { _id: '$event', avgRating: { $avg: '$rating' } } }
  ]);
  const ratingMap = Object.fromEntries(feedbackStats.map(f => [f._id.toString(), f.avgRating]));

  const withCounts = events.map((e) => {
    const o = e.toObject();
    o.registrationCount = countMap[e._id.toString()] || 0;
    o.avgRating = ratingMap[e._id.toString()] || 0;
    return o;
  });

  if (req.user) {
    withCounts.sort((a, b) => {
      if (preferredLocationType) {
        if (a.locationType === preferredLocationType && b.locationType !== preferredLocationType) return -1;
        if (b.locationType === preferredLocationType && a.locationType !== preferredLocationType) return 1;
      }
      if (b.avgRating !== a.avgRating) {
        return b.avgRating - a.avgRating;
      }
      return new Date(a.startDateTime) - new Date(b.startDateTime);
    });
  }

  res.json(withCounts);
}

export async function getEvent(req, res) {
  const event = await Event.findById(req.params.id)
    .populate('category')
    .populate('venue')
    .populate('createdBy', 'name email');
  if (!event) return res.status(404).json({ message: 'Event not found' });
  const registrationCount = await Registration.countDocuments({ event: event._id });
  const o = event.toObject();
  o.registrationCount = registrationCount;
  res.json(o);
}

export async function createEvent(req, res) {
  try {
    const { title, description, category, venue, startDateTime, endDateTime, capacity, ticketPrice, locationType, ticketingType, ticketTiers, link, forceLimit } = req.body;
    const start = new Date(startDateTime);
    let end = endDateTime ? new Date(endDateTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);

    const { start: dayStart, end: dayEnd } = localDayBounds(start);
    if (endDateTime) {
      if (end < dayStart || end >= dayEnd) {
        return res.status(400).json({ message: 'End date must be on the same day as the start date.' });
      }
      if (end <= start) {
        return res.status(400).json({ message: 'End time must be after the start time.' });
      }
    }

    const countSameLocationType = await Event.countDocuments({
      locationType,
      startDateTime: { $gte: dayStart, $lt: dayEnd },
    });
    if (countSameLocationType >= 2 && forceLimit !== 'true') {
      return res.status(409).json({
        code: 'EVENT_LIMIT_WARNING',
        message: `There are already ${countSameLocationType} ${locationType} events today. Are you sure you want to create another one?`,
      });
    }

    // Disallow multiple events in the same venue + category on the same local-calendar day.
    const sameDayExisting = await Event.findOne({
      venue,
      category,
      startDateTime: { $gte: dayStart, $lt: dayEnd },
    }).select('_id title startDateTime');
    if (sameDayExisting) {
      return res.status(409).json({
        code: 'EVENT_DUPLICATE_VENUE_DAY_CATEGORY',
        message: `Not allowed: an event already exists for this venue and category on ${fmtLocalDay(start)}.`,
      });
    }

    const venueErr = await assertVenueAvailable(venue, start, end);
    if (venueErr) {
      return res.status(400).json({ message: venueErr });
    }
    const imageFile = req.files?.photo?.[0] || null;
    const videoFile = req.files?.video?.[0] || null;
    const pdfFile = req.files?.pdf?.[0] || null;
    if (imageFile && imageFile.size > 5 * 1024 * 1024) {
      return res.status(400).json({ message: 'That image is too large. Please use a JPEG/PNG under 5 MB.' });
    }
    const image = imageFile ? getPublicUploadPath(imageFile.filename) : '';
    const video = videoFile ? getPublicUploadPath(videoFile.filename) : '';
    const pdf = pdfFile ? getPublicUploadPath(pdfFile.filename) : '';
    const event = await Event.create({
      title: title?.trim(),
      description: description || '',
      category,
      venue,
      startDateTime: start,
      endDateTime: end,
      capacity: Number(capacity),
      ticketPrice: Number(ticketPrice ?? 0),
      locationType: locationType || 'Indoor',
      ticketingType: ticketingType || 'Free',
      ticketTiers: typeof ticketTiers === 'string' ? JSON.parse(ticketTiers) : (Array.isArray(ticketTiers) ? ticketTiers : []),
      link: link || '',
      video,
      image,
      pdf,
      createdBy: req.user.id,
    });
    const populated = await Event.findById(event._id)
      .populate('category')
      .populate('venue')
      .populate('createdBy', 'name email');
    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    if (err?.code === 11000) {
      return res.status(409).json({
        code: 'EVENT_DUPLICATE_VENUE_DAY_CATEGORY',
        message: 'Not allowed: an event already exists for this venue and category on the selected day.',
      });
    }
    res.status(400).json({ message: err.message || 'Failed to create event' });
  }
}

export async function updateEvent(req, res) {
  try {
    const { title, description, category, venue, startDateTime, endDateTime, capacity, ticketPrice, locationType, ticketingType, ticketTiers, link } = req.body;
    const notifyStudentsRaw = req.body?.notifyStudents;
    const notifyStudents =
      notifyStudentsRaw === true || notifyStudentsRaw === 'true' || notifyStudentsRaw === '1';
    const update = {};
    if (title != null) update.title = title.trim();
    if (description != null) update.description = description;
    if (category) update.category = category;
    if (venue) update.venue = venue;
    if (startDateTime) update.startDateTime = new Date(startDateTime);
    if (endDateTime) update.endDateTime = new Date(endDateTime);
    if (capacity != null) update.capacity = Number(capacity);
    if (ticketPrice != null) update.ticketPrice = Number(ticketPrice);
    if (locationType) update.locationType = locationType;
    if (ticketingType) update.ticketingType = ticketingType;
    if (ticketTiers !== undefined) {
      update.ticketTiers = typeof ticketTiers === 'string' ? JSON.parse(ticketTiers) : (Array.isArray(ticketTiers) ? ticketTiers : []);
    }
    if (link !== undefined) update.link = link;
    
    const imageFile = req.files?.photo?.[0] || null;
    const videoFile = req.files?.video?.[0] || null;
    const pdfFile = req.files?.pdf?.[0] || null;
    
    if (imageFile && imageFile.size > 5 * 1024 * 1024) {
      return res.status(400).json({ message: 'That image is too large. Please use a JPEG/PNG under 5 MB.' });
    }
    if (imageFile) update.image = getPublicUploadPath(imageFile.filename);
    if (videoFile) update.video = getPublicUploadPath(videoFile.filename);
    if (pdfFile) update.pdf = getPublicUploadPath(pdfFile.filename);

    const current = await Event.findById(req.params.id);
    if (!current) return res.status(404).json({ message: 'Event not found' });

    const nextVenue = update.venue || current.venue;
    const nextCategory = update.category || current.category;
    const nextStart = update.startDateTime || current.startDateTime;

    // Disallow multiple events in the same venue + category on the same local-calendar day.
    const { start: dayStart, end: dayEnd } = localDayBounds(nextStart);
    const sameDayExisting = await Event.findOne({
      _id: { $ne: current._id },
      venue: nextVenue,
      category: nextCategory,
      startDateTime: { $gte: dayStart, $lt: dayEnd },
    }).select('_id title startDateTime');
    if (sameDayExisting) {
      return res.status(409).json({
        code: 'EVENT_DUPLICATE_VENUE_DAY_CATEGORY',
        message: `Not allowed: an event already exists for this venue and category on ${fmtLocalDay(nextStart)}.`,
      });
    }

    // Keep derived day field in sync when relevant fields are touched.
    // (Model pre-validate doesn't run for findByIdAndUpdate.)
    if (update.startDateTime || update.venue || update.category) {
      update.eventDay = fmtLocalDay(nextStart);
    }

    const updatedFields = computeUpdatedFields(current, update);
    if (updatedFields.length > 0) {
      update.lastUpdatedAt = new Date();
      update.updatedFields = updatedFields;
    }

    const nextEnd = update.endDateTime || current.endDateTime;
    const venueErr = await assertVenueAvailable(nextVenue, nextStart, nextEnd, current._id);
    if (venueErr) {
      return res.status(400).json({ message: venueErr });
    }

    const event = await Event.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    })
      .populate('category')
      .populate('venue')
      .populate('createdBy', 'name email');
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (notifyStudents && updatedFields.length > 0) {
      const regs = await Registration.find({ event: event._id }).select('user').lean();
      const userIds = [...new Set(regs.map((r) => String(r.user)))];
      if (userIds.length > 0) {
        const link = `/events/${event._id}`;
        const message = `Updated: "${event.title}". Check the event page for the latest details.`;

        try {
          await Notification.insertMany(
            userIds.map((uid) => ({
              user: uid,
              title: 'Event updated',
              message,
              link,
              meta: { kind: 'event_updated', event: event._id },
            }))
          );
        } catch (e) {
          console.error('[event-update-notify] Notification.insertMany failed', e.message);
        }

        const users = await User.find({ _id: { $in: userIds } }).select('email').lean();
        for (const u of users) {
          if (!u.email) continue;
          await sendMail({
            to: u.email,
            subject: `Updated: ${event.title}`,
            text: `${message}\n\nOpen: ${link}`,
          }).catch((e) => console.error('[event-update-notify] sendMail failed', u.email, e.message));
        }
      }
    }

    res.json(event);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        code: 'EVENT_DUPLICATE_VENUE_DAY_CATEGORY',
        message: 'Not allowed: an event already exists for this venue and category on the selected day.',
      });
    }
    res.status(400).json({ message: err.message });
  }
}

export async function deleteEvent(req, res) {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ message: 'Event not found' });
  const regs = await Registration.find({ event: event._id });
  const regIds = regs.map((r) => r._id);
  await Ticket.deleteMany({ registration: { $in: regIds } });
  await Registration.deleteMany({ event: event._id });
  await Feedback.deleteMany({ event: event._id });
  await Event.findByIdAndDelete(event._id);
  res.json({ message: 'Deleted' });
}

export async function downloadParticipantsXlsx(req, res) {
  const eventId = req.params.id;
  const event = await Event.findById(eventId)
    .populate('venue', 'name location')
    .populate('category', 'name');
  if (!event) return res.status(404).json({ message: 'Event not found' });

  const regs = await Registration.find({ event: event._id })
    .populate('user', 'name email')
    .sort({ createdAt: 1 })
    .lean();

  const rows = regs.map((r, idx) => ({
    No: idx + 1,
    Name: r.user?.name || '',
    Email: r.user?.email || '',
    TicketTier: r.ticketTier || 'N/A',
    RegisteredAt: r.createdAt ? new Date(r.createdAt) : null,
  }));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'GatherUp';
  wb.created = new Date();
  const ws = wb.addWorksheet('Participants');

  ws.addRow([event.title]).font = { bold: true, size: 14 };
  ws.addRow([`Category: ${event.category?.name || '-'}`]);
  ws.addRow([`Venue: ${event.venue?.name || '-'} ${event.venue?.location ? `- ${event.venue.location}` : ''}`]);
  ws.addRow([`When: ${new Date(event.startDateTime).toLocaleString()} → ${new Date(event.endDateTime).toLocaleString()}`]);
  ws.addRow([`Total participants: ${rows.length}`]);
  ws.addRow([]);

  ws.columns = [
    { header: 'No', key: 'No', width: 6 },
    { header: 'Name', key: 'Name', width: 24 },
    { header: 'Email', key: 'Email', width: 32 },
    { header: 'Ticket Tier', key: 'TicketTier', width: 20 },
    { header: 'RegisteredAt', key: 'RegisteredAt', width: 22 },
  ];

  ws.getRow(ws.lastRow.number).font = { bold: true };

  for (const r of rows) {
    ws.addRow(r);
  }

  // Style header row (the columns header row is at row 7)
  const headerRow = ws.getRow(7);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEFE7FF' },
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    };
  });

  const safeBase = String(event.title || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const filename = `${safeBase || 'event'}-participants.xlsx`;

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await wb.xlsx.write(res);
  res.end();
}

export async function incrementParticipantCount(req, res) {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { $inc: { manualParticipantCount: 1 } },
      { new: true }
    );
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ manualParticipantCount: event.manualParticipantCount });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}
