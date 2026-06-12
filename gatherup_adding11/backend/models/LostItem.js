import mongoose from 'mongoose';

function notInFutureMessage(label) {
  return `${label} cannot be in the future`;
}

const lostItemSchema = new mongoose.Schema(
  {
    publicId: { type: String, unique: true, sparse: true },
    /** User who posted; API responses also expose this as `user: { _id, name }`. */
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    itemName: { type: String, required: true, trim: true, maxlength: 20 },
    description: { type: String, default: '', maxlength: 200 },
    category: { type: String, required: true, trim: true },
    dateLost: {
      type: Date,
      required: true,
      validate: {
        validator(v) {
          return v instanceof Date && !Number.isNaN(v.getTime()) && v.getTime() <= Date.now();
        },
        message: () => notInFutureMessage('Date lost'),
      },
    },
    location: { type: String, required: true, trim: true },
    photo: { type: String, default: '' },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
    matchedFoundItem: { type: mongoose.Schema.Types.ObjectId, ref: 'FoundItem', default: null },
    isDeleted: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false },
    /** Admin: hide from public search/detail (owner retains access) */
    moderationHidden: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['Looking', 'FoundByOwner', 'Matched', 'Resolved', 'Closed', 'Found'],
      default: 'Looking',
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

lostItemSchema.index({ reporter: 1, itemName: 1, location: 1, status: 1 });

export default mongoose.model('LostItem', lostItemSchema);
