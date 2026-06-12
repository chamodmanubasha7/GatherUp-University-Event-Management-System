import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    link: { type: String, default: '' },
    /** Optional reference when the message concerns a removed or related listing (no FK after hard delete). */
    relatedItemId: { type: mongoose.Schema.Types.ObjectId },
    relatedItemType: { type: String, enum: ['lost', 'found'] },
    /** Lost & Found tips: deep-link context for UI */
    meta: {
      kind: {
        type: String,
        enum: ['lost_tip', 'found_tip', 'generic', 'event_started', 'event_updated', 'admin_removed_item'],
        default: 'generic',
      },
      lostItem: { type: mongoose.Schema.Types.ObjectId, ref: 'LostItem', default: null },
      foundItem: { type: mongoose.Schema.Types.ObjectId, ref: 'FoundItem', default: null },
      fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
