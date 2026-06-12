import mongoose from 'mongoose';

/**
 * One row per “I think this found item is mine” action (notify finder / POST /api/claims).
 * Used for rolling 24h claim limits only.
 */
const foundItemClaimSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    foundItem: { type: mongoose.Schema.Types.ObjectId, ref: 'FoundItem', required: true },
  },
  { timestamps: true }
);

foundItemClaimSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('FoundItemClaim', foundItemClaimSchema);
