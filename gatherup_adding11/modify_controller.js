const fs = require('fs');
let code = fs.readFileSync('backend/controllers/eventController.js', 'utf8');

const listEventsNew = `export async function listEvents(req, res) {
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
}`;
code = code.replace(/export async function listEvents[\s\S]*?res\.json\(withCounts\);\n}/, listEventsNew);

const createEventOld = `const { title, description, category, venue, startDateTime, endDateTime, capacity, ticketPrice, locationType, ticketingType, ticketTiers, link } = req.body;
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    // Disallow multiple events in the same venue + category on the same local-calendar day.
    const { start: dayStart, end: dayEnd } = localDayBounds(start);`;

const createEventNew = `const { title, description, category, venue, startDateTime, endDateTime, capacity, ticketPrice, locationType, ticketingType, ticketTiers, link, forceLimit } = req.body;
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
        message: \`There are already \${countSameLocationType} \${locationType} events today. Are you sure you want to create another one?\`,
      });
    }

    // Disallow multiple events in the same venue + category on the same local-calendar day.`;

code = code.replace(createEventOld, createEventNew);

fs.writeFileSync('backend/controllers/eventController.js', code);
