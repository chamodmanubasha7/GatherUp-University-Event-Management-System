import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import Ticket from '../models/Ticket.js';
import Feedback from '../models/Feedback.js';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';

/** Admin dashboard aggregates */
export async function getAnalytics(req, res) {
  const totalEvents = await Event.countDocuments();
  const totalRegistrations = await Registration.countDocuments();
  const totalTicketsUsed = await Ticket.countDocuments({ status: 'used' });

  const topEvents = await Registration.aggregate([
    { $group: { _id: '$event', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 },
    {
      $lookup: {
        from: 'events',
        localField: '_id',
        foreignField: '_id',
        as: 'event',
      },
    },
    { $unwind: '$event' },
    {
      $project: {
        title: '$event.title',
        registrations: '$count',
        startDateTime: '$event.startDateTime',
      },
    },
  ]);

  const ratingsAgg = await Feedback.aggregate([
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);
  const avgRating = ratingsAgg[0]
    ? Math.round(ratingsAgg[0].avgRating * 10) / 10
    : 0;
  const feedbackCount = ratingsAgg[0]?.count || 0;

  const lostByStatus = await LostItem.aggregate([
    {
      $match: {
        isDeleted: { $ne: true },
        hidden: { $ne: true },
        moderationHidden: { $ne: true },
      },
    },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const foundByStatus = await FoundItem.aggregate([
    {
      $match: {
        isDeleted: { $ne: true },
        hidden: { $ne: true },
        moderationHidden: { $ne: true },
      },
    },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const attendanceRate =
    totalRegistrations > 0
      ? Math.round((totalTicketsUsed / totalRegistrations) * 1000) / 10
      : 0;

  res.json({
    totalEvents,
    totalRegistrations,
    totalTicketsUsed,
    globalAttendanceRatePercent: attendanceRate,
    averageRating: avgRating,
    feedbackCount,
    topEventsByRegistrations: topEvents,
    lostByStatus,
    foundByStatus,
  });
}
