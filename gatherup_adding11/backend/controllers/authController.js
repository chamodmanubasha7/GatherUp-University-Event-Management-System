import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { validationResult } from 'express-validator';
import { getPublicUploadPath } from '../middleware/upload.js';
import { generateOTP, getOTPExpiration, sendOTPEmail, verifyOTP as checkOTP } from '../utils/otp.js';

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

export async function register(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, msg: e.msg })),
      });
    }
    const { email, password, name, role, username, phoneNumber, address, idNumber } = req.body;
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const user = await User.create({
      email,
      password,
      name,
      role: role === 'admin' ? 'admin' : 'student',
      username,
      phoneNumber,
      address,
      idNumber,
    });
    const token = signToken(user._id);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar || '',
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Registration failed' });
  }
}

export async function login(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, msg: e.msg })),
      });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = signToken(user._id);
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar || '',
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
}

export async function me(req, res) {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Ensure all cards have IDs (for deletion of legacy data)
  let changed = false;
  if (user.savedCards) {
    user.savedCards.forEach((card) => {
      if (!card._id) {
        card._id = new mongoose.Types.ObjectId();
        changed = true;
      }
    });
  }
  if (changed) {
    user.markModified('savedCards');
    await user.save();
  }
  res.json({
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar || '',
    phone: user.phone || user.phoneNumber || '',
    username: user.username || '',
    address: user.address || '',
    idNumber: user.idNumber || '',
    shareContactInLostFound: !!user.shareContactInLostFound,
    savedCards: user.savedCards || [],
  });
}

export async function updateProfile(req, res) {
  const { name, phone, shareContactInLostFound, username, phoneNumber, address, idNumber } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (name !== undefined) user.name = String(name).trim();
  if (phone !== undefined) user.phone = String(phone).trim();
  if (shareContactInLostFound !== undefined) {
    user.shareContactInLostFound = Boolean(shareContactInLostFound);
  }
  if (phoneNumber !== undefined) user.phoneNumber = String(phoneNumber).trim();
  if (username !== undefined) user.username = String(username).trim();
  if (address !== undefined) user.address = String(address).trim();
  if (idNumber !== undefined) user.idNumber = String(idNumber).trim();
  await user.save();
  res.json({
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar || '',
    phone: user.phone || user.phoneNumber || '',
    username: user.username || '',
    address: user.address || '',
    idNumber: user.idNumber || '',
    shareContactInLostFound: !!user.shareContactInLostFound,
  });
}

export async function updateProfilePhoto(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'Please choose a JPEG/PNG image under 5 MB.' });
  user.avatar = getPublicUploadPath(file.filename);
  await user.save();
  res.json({
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar || '',
  });
}

export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to change password' });
  }
}

export async function sendOTP(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, msg: e.msg })),
      });
    }

    const { email } = req.body;
    const normalizedEmail = email.toLowerCase();

    // Check if email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Generate and store OTP
    const otp = generateOTP();
    const otpExpires = getOTPExpiration();

    // Create a temporary user with OTP (not verified yet)
    await User.findOneAndUpdate(
      { email: normalizedEmail },
      { otp, otpExpires, isVerified: false },
      { upsert: true, new: true, setDefaultsOnInsert: false }
    );

    // Send OTP email
    await sendOTPEmail(normalizedEmail, otp);

    res.json({ message: 'OTP sent successfully', email: normalizedEmail });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
}

export async function verifyOTP(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, msg: e.msg })),
      });
    }

    const { email, otp, userData } = req.body;
    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found. Please request OTP first.' });
    }

    // Check if OTP is expired
    if (user.otpExpires && new Date() > user.otpExpires) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Verify OTP
    if (!checkOTP(user.otp, otp)) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Update user with registration data and mark as verified
    user.name = userData.name;
    user.password = userData.password;
    user.role = userData.role === 'admin' ? 'admin' : 'student';
    user.username = userData.username;
    user.phoneNumber = userData.phoneNumber;
    user.address = userData.address;
    user.idNumber = userData.idNumber;
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;

    await user.save();

    // Generate token
    const token = signToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar || '',
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Verification failed' });
  }
}

export async function resendOTP(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, msg: e.msg })),
      });
    }

    const { email } = req.body;
    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpires = getOTPExpiration();

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Send OTP email
    await sendOTPEmail(normalizedEmail, otp);

    res.json({ message: 'OTP resent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to resend OTP' });
  }
}
