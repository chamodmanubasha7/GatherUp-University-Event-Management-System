import mongoose from 'mongoose';

const paymentFeedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', maxlength: 1000, trim: true },
  },
  { timestamps: true }
);

paymentFeedbackSchema.index({ userId: 1, paymentId: 1 }, { unique: true });

export default mongoose.model('PaymentFeedback', paymentFeedbackSchema);
