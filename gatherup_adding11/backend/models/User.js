import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const savedCardSchema = new mongoose.Schema(
  {
    cardName: { type: String, default: 'My Card', trim: true },
    cardNumber: { type: String, required: true, trim: true },
    expiry: { type: String, required: true, trim: true },
    cvv: { type: String, required: true, trim: true },
  }
);

const userSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, sparse: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['student', 'admin', 'user'], default: 'student' },
    /** Public URL path served from `/uploads/*` */
    avatar: { type: String, default: '' },
    
    // Extended Profile (from ITPM)
    fullName: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },
    address: { type: String, trim: true },
    idNumber: { type: String, sparse: true, trim: true },
    bio: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    
    // Lost & Found / Payments
    shareContactInLostFound: { type: Boolean, default: false },
    savedCards: { type: [savedCardSchema], default: [] },

    // OTP Verification
    otp: { type: String },
    otpExpires: { type: Date },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', userSchema);
