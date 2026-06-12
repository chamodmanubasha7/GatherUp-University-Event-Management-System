import { Router } from 'express';
import {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  downloadParticipantsXlsx,
  incrementParticipantCount,
} from '../controllers/eventController.js';
import { authenticate, authenticateOptional, requireAdmin } from '../middleware/auth.js';
import { uploadEventMediaOptional } from '../middleware/upload.js';

import { body } from 'express-validator';
import { handleValidation } from '../middleware/validate.js';

const router = Router();

router.get('/', authenticateOptional, listEvents);
router.get('/:id', getEvent);

const eventValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Event title is required. Give your event a catchy name.'),
  body('category')
    .isMongoId()
    .withMessage('Please select a valid category from the list.'),
  body('venue')
    .isMongoId()
    .withMessage('Please select a valid venue for the event.'),
  body('startDateTime')
    .isISO8601()
    .toDate()
    .withMessage('Please provide a valid start date and time for the event.'),
  body('endDateTime')
    .isISO8601()
    .toDate()
    .withMessage('Please provide a valid end date and time for the event.')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDateTime)) {
        throw new Error('The end date must be set after the start date and time.');
      }
      return true;
    }),
  body('capacity')
    .isInt({ min: 1 })
    .withMessage('Event capacity must be at least 1 person.'),
  body('ticketPrice')
    .isFloat({ min: 0 })
    .withMessage('Ticket price cannot be negative. Enter 0 for free events.'),
];

router.post(
  '/',
  authenticate,
  requireAdmin,
  uploadEventMediaOptional,
  eventValidation,
  handleValidation,
  createEvent
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  uploadEventMediaOptional,
  [
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty if provided'),
    body('category').optional().isMongoId().withMessage('Invalid category selection'),
    body('venue').optional().isMongoId().withMessage('Invalid venue selection'),
    body('startDateTime').optional().isISO8601().toDate().withMessage('Invalid start date format'),
    body('endDateTime')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('Invalid end date format')
      .custom((value, { req }) => {
        if (req.body.startDateTime && new Date(value) <= new Date(req.body.startDateTime)) {
          throw new Error('End date must be after the new start date.');
        }
        return true;
      }),
    body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
    body('ticketPrice').optional().isFloat({ min: 0 }).withMessage('Price cannot be negative'),
  ],
  handleValidation,
  updateEvent
);
router.get('/:id/participants.xlsx', authenticate, requireAdmin, downloadParticipantsXlsx);
router.patch('/:id/increment-count', authenticate, requireAdmin, incrementParticipantCount);
router.delete('/:id', authenticate, requireAdmin, deleteEvent);

export default router;
