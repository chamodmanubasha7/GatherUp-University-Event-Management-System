import mongoose from 'mongoose';

function notInFutureMessage(label) {
  return `${label} cannot be in the future`;
}

const foundItemSchema = new mongoose.Schema(
  {
    publicId: { type: String, unique: true, sparse: true },
    /** User who posted; API responses also expose this as `user: { _id, name }`. */
    finder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    itemName: { type: String, required: true, trim: true, maxlength: 20 },
    description: { type: String, default: '', maxlength: 200 },
    category: { type: String, required: true, trim: true },
    dateFound: {
      type: Date,
      required: true,
      validate: {
        validator(v) {
          return v instanceof Date && !Number.isNaN(v.getTime()) && v.getTime() <= Date.now();
        },
        message: () => notInFutureMessage('Date found'),
      },
    },
    location: { type: String, required: true, trim: true },
    photo: { type: String, default: '' },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
    matchedLostItem: { type: mongoose.Schema.Types.ObjectId, ref: 'LostItem', default: null },
    isDeleted: { type: Boolean, default: false },
    moderationHidden: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['Unclaimed', 'Claimed', 'PendingVerification', 'ReadyForPickup', 'Resolved', 'Rejected'],
      default: 'Unclaimed',
    },
    statusHistory: [
      {
        status: String,
        at: { type: Date, default: Date.now },
        note: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('FoundItem', foundItemSchema);
