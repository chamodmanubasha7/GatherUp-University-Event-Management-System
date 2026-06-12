import mongoose from 'mongoose';

/** Written when an admin successfully validates a QR ticket (ticket becomes `used`). */
const ticketUsageLogSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
    scannedAt: { type: Date, default: Date.now },
    scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

ticketUsageLogSchema.index({ scannedAt: -1 });
ticketUsageLogSchema.index({ eventId: 1, scannedAt: -1 });

export default mongoose.model('TicketUsageLog', ticketUsageLogSchema);
