import mongoose from 'mongoose';

/**
 * Secure QR ticket: signed JSON in qrData, pre-rendered PNG data URL in qrCode.
 *
 * The `registration` field must match the MongoDB path used by the unique index.
 * If tickets were previously stored under `registrationId`, run sync (see server startup)
 * or migrate documents so each ticket has `registration` set to the Registration _id.
 */
const ticketSchema = new mongoose.Schema(
  {
    registration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Registration',
      required: true,
      unique: true,
    },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    /** JSON string: { ticketId, eventId, userId, issuedAt, sig } encoded in QR */
    qrData: { type: String, required: true },
    /** PNG data URL of the QR image */
    qrCode: { type: String, required: true },
    status: { type: String, enum: ['unused', 'used'], default: 'unused' },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ticketSchema.index({ eventId: 1, status: 1 });
ticketSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Ticket', ticketSchema);
