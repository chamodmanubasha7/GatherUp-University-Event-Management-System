import Registration from '../models/Registration.js';
import Event from '../models/Event.js';

/**
 * Simple content-based suggestions: events in categories the user has registered for,
 * excluding past registrations and events already full / already registered.
 */
export async function recommendForUser(req, res) {
  const userId = req.user.id;
  const myRegs = await Registration.find({ user: userId }).populate({
    path: 'event',
    select: 'category title',
  });
  const categoryIds = [
    ...new Set(
      myRegs
        .map((r) => r.event?.category?.toString())
        .filter(Boolean)
    ),
  ];

  if (categoryIds.length === 0) {
    const upcoming = await Event.find({ startDateTime: { $gte: new Date() } })
      .populate('category', 'name')
      .populate('venue', 'name')
      .sort({ startDateTime: 1 })
      .limit(8);
    return res.json({ source: 'popular_upcoming', events: upcoming });
  }

  const myEventIds = myRegs.map((r) => r.event?._id).filter(Boolean);
  const events = await Event.find({
    category: { $in: categoryIds },
    _id: { $nin: myEventIds },
    startDateTime: { $gte: new Date() },
  })
    .populate('category', 'name')
    .populate('venue', 'name')
    .sort({ startDateTime: 1 })
    .limit(12);

  res.json({ source: 'by_category', events });
}
