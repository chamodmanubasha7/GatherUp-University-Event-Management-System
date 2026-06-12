import mongoose from 'mongoose';

/**
 * Manual coordination about a lost or found listing.
 * (Legacy DB may still have relatedLostItem/relatedFoundItem/readByReceiver — queries support both.)
 */
const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lostItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'LostItem', default: null },
    foundItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoundItem', default: null },
    /** @deprecated use lostItemId — kept for existing documents */
    relatedLostItem: { type: mongoose.Schema.Types.ObjectId, ref: 'LostItem', default: null },
    /** @deprecated use foundItemId */
    relatedFoundItem: { type: mongoose.Schema.Types.ObjectId, ref: 'FoundItem', default: null },
    text: { type: String, trim: true, maxlength: 4000, default: '' },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    read: { type: Boolean, default: false },
    /** @deprecated use read */
    readByReceiver: { type: Boolean, default: false },
    /** Users who hid this message for themselves (thread cleared); other party still sees it. */
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

messageSchema.index({ lostItemId: 1, createdAt: -1 });
messageSchema.index({ foundItemId: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, read: 1 });
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });

messageSchema.pre('validate', function validateText(next) {
  if (!this.deletedAt && !(this.text && String(this.text).trim())) {
    return next(new Error('Message text is required'));
  }
  next();
});

export default mongoose.model('Message', messageSchema);
