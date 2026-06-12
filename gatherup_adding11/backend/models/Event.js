import mongoose from 'mongoose';

/**
 * Event window uses explicit start/end instants (not a single `date`).
 * Legacy DBs with only `date`: run `npm run migrate:event-dates` from backend/.
 */
const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
    /**
     * Local-calendar day derived from `startDateTime` (YYYY-MM-DD).
     * Used for uniqueness constraints like (venue, category, day).
     *
     * NOTE: Kept optional to avoid breaking existing DBs. New/updated events will populate it.
     */
    eventDay: { type: String, default: null },
    startDateTime: { type: Date, required: true },
    endDateTime: { type: Date, required: true },
    capacity: { type: Number, required: true, min: 1 },
    ticketPrice: { type: Number, required: true, min: 0, default: 0 },
    locationType: { type: String, enum: ['Indoor', 'Outdoor'], default: 'Indoor' },
    ticketingType: { type: String, enum: ['Free', 'Ticket'], default: 'Free' },
    ticketTiers: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
      }
    ],
    manualParticipantCount: { type: Number, default: 0 },
    video: { type: String, default: '' },
    image: { type: String, default: '' },
    pdf: { type: String, default: '' },
    link: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    /** Set true after “event started” notifications are sent to ticket holders (cron, once). */
    startNotificationSent: { type: Boolean, default: false },
    /**
     * When admins edit an event, we keep a small "update marker" so students can spot changes.
     * `updatedFields` uses API field names (e.g. "startDateTime", "venue", "description").
     */
    lastUpdatedAt: { type: Date, default: null },
    updatedFields: { type: [String], default: [] },
  },
  { timestamps: true }
);

eventSchema.pre('validate', function validateTimes(next) {
  if (this.endDateTime && this.startDateTime && this.endDateTime <= this.startDateTime) {
    this.invalidate('endDateTime', 'End must be after start');
  }
  if (this.startDateTime) {
    const d = new Date(this.startDateTime);
    const pad = (n) => String(n).padStart(2, '0');
    this.eventDay = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  next();
});

// Enforce uniqueness for NEW/UPDATED docs (does not block legacy docs without `eventDay`)
eventSchema.index(
  { venue: 1, category: 1, eventDay: 1 },
  {
    unique: true,
    name: 'uniq_event_venue_category_day',
    partialFilterExpression: { eventDay: { $type: 'string' } },
  }
);

export default mongoose.model('Event', eventSchema);
