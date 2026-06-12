import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, me, updateProfile, updateProfilePhoto, changePassword, sendOTP, verifyOTP, resendOTP } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { handleValidation } from '../middleware/validate.js';
import { uploadOptional } from '../middleware/upload.js';

const router = Router();

router.post(
  '/register',
  [
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email address (e.g., name@example.com)')
      .normalizeEmail()
      .isLength({ max: 255 })
      .withMessage('Email address is too long'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
      .matches(/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]*$/)
      .withMessage('Password contains invalid characters'),
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Full name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters')
      .matches(/^[a-zA-Z\s\-']+$/)
      .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('phoneNumber')
      .trim()
      .notEmpty()
      .withMessage('Phone number is required')
      .isLength({ min: 10, max: 20 })
      .withMessage('Phone number must be between 10 and 20 characters')
      .matches(/^\+?[0-9\s\-()]+$/)
      .withMessage('Phone number format is invalid. Use: +1234567890 or 123-456-7890'),
    body('idNumber')
      .trim()
      .notEmpty()
      .withMessage('ID number is required')
      .isLength({ min: 5, max: 50 })
      .withMessage('ID number must be between 5 and 50 characters')
      .matches(/^[a-zA-Z0-9\-]+$/)
      .withMessage('ID number can only contain letters, numbers, and hyphens'),
    body('address')
      .trim()
      .notEmpty()
      .withMessage('Address is required')
      .isLength({ min: 5, max: 255 })
      .withMessage('Address must be between 5 and 255 characters'),
  ],
  handleValidation,
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Enter a valid email to log in'),
    body('password').notEmpty().withMessage('Password is required to log in'),
  ],
  handleValidation,
  login
);

router.get('/me', authenticate, me);

router.put(
  '/profile',
  authenticate,
  [
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Name cannot be empty. Please provide a valid name.'),
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3 })
      .withMessage('Username must be at least 3 characters long'),
    body('phoneNumber')
      .optional()
      .trim()
      .matches(/^[0-9+ ]+$/)
      .withMessage('Phone number can only contain digits, spaces, and the "+" symbol'),
    body('idNumber')
      .optional()
      .trim()
      .isAlphanumeric()
      .withMessage('ID Number should only contain letters and numbers'),
  ],
  handleValidation,
  updateProfile
);

router.put('/profile-photo', authenticate, uploadOptional, updateProfilePhoto);

router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required to verify your identity'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long'),
  ],
  handleValidation,
  changePassword
);

router.post(
  '/send-otp',
  [
    body('email').isEmail().withMessage('Please enter a valid email address').normalizeEmail(),
  ],
  handleValidation,
  sendOTP
);

router.post(
  '/verify-otp',
  [
    body('email').isEmail().withMessage('Please enter a valid email address').normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    body('userData').isObject().withMessage('User data is required'),
  ],
  handleValidation,
  verifyOTP
);

router.post(
  '/resend-otp',
  [
    body('email').isEmail().withMessage('Please enter a valid email address').normalizeEmail(),
  ],
  handleValidation,
  resendOTP
);

export default router;
