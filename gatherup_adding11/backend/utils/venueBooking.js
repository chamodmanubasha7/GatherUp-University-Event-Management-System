import Event from '../models/Event.js';
import { intervalsOverlap } from './eventOverlap.js';

/**
 * Returns error message if new event times conflict with another event at the same venue.
 */
export async function assertVenueAvailable(venueId, startDateTime, endDateTime, excludeEventId = null) {
  const q = { venue: venueId };
  if (excludeEventId) q._id = { $ne: excludeEventId };
  const others = await Event.find(q);
  for (const o of others) {
    if (intervalsOverlap(o.startDateTime, o.endDateTime, startDateTime, endDateTime)) {
      return `Venue is already booked for "${o.title}" during this time window`;
    }
  }
  return null;
}
