import cron from 'node-cron';
import Event from '../models/Event.js';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { sendMail } from '../utils/email.js';

/**
 * Events whose start falls in [now - WINDOW, now] are considered “just started”.
 * Avoids notifying very old events if the server was offline or the flag was missing.
 */
const WINDOW_MS = 5 * 60 * 1000;

async function runEventStartNotifications() {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);

  const candidates = await Event.find({
    startNotificationSent: { $ne: true },
    startDateTime: { $lte: now, $gte: windowStart },
  })
    .select('_id title')
    .lean();

  for (const ev of candidates) {
    const claimed = await Event.findOneAndUpdate(
      {
        _id: ev._id,
        startNotificationSent: { $ne: true },
        startDateTime: { $lte: now, $gte: windowStart },
      },
      { $set: { startNotificationSent: true } },
      { new: true }
    );

    if (!claimed) continue;

    const tickets = await Ticket.find({ eventId: claimed._id }).select('userId').lean();
    const userIdSet = new Set(tickets.map((t) => String(t.userId)));
    if (userIdSet.size === 0) continue;

    const message = `The event ${claimed.title} has started! Join now.`;
    const titleNotif = `The event "${claimed.title}" has started!`;
    const link = `/events/${claimed._id}`;

    const users = await User.find({ _id: { $in: [...userIdSet] } })
      .select('email name')
      .lean();

    for (const u of users) {
      try {
        await Notification.create({
          user: u._id,
          title: 'Event started',
          message,
          link,
          meta: { kind: 'event_started', event: claimed._id },
        });
      } catch (e) {
        console.error('[event-start-notifications] Notification.create failed', u._id, e.message);
      }

      try {
        await sendMail({
          to: u.email,
          subject: titleNotif,
          text: message,
        });
      } catch (e) {
        console.error('[event-start-notifications] sendMail failed', u.email, e.message);
      }
    }

    console.log(
      `[event-start-notifications] Notified ${users.length} ticket holder(s) for event "${claimed.title}" (${claimed._id})`
    );
  }
}

export function startEventStartNotificationScheduler() {
  cron.schedule('* * * * *', () => {
    runEventStartNotifications().catch((e) => console.error('[event-start-notifications]', e));
  });
  console.log('[cron] Event start notifications scheduled (every minute)');
}
