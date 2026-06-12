import mongoose from 'mongoose';

const paymentDetailsSchema = new mongoose.Schema(
  {
    cardName: { type: String, default: '' },
    cardLast4: { type: String, default: '' },
    cardExpiry: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountHolder: { type: String, default: '' },
    accountNumberLast4: { type: String, default: '' },
    upiId: { type: String, default: '' },
    provider: { type: String, default: '' },
    referenceNote: { type: String, default: '' },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
    registrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', default: null },
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', default: null },
    eventName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'completed', 'refunded'],
      default: 'pending',
    },
    method: {
      type: String,
      enum: ['card', 'upi', 'netbanking', 'cash'],
      default: 'card',
    },
    transactionId: { type: String, default: '' },
    refundReason: { type: String, default: '' },
    receiptGeneratedAt: { type: Date },
    notes: { type: String, default: '' },
    paymentDetails: { type: paymentDetailsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ eventName: 1, status: 1 });

export default mongoose.model('Payment', paymentSchema);
