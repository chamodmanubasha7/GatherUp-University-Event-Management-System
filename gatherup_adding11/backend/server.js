import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import venueRoutes from './routes/venueRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import registrationRoutes from './routes/registrationRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import lostFoundRoutes from './routes/lostFoundRoutes.js';
import claimsRoutes from './routes/claimsRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import recommendRoutes from './routes/recommendRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import paymentAdminRoutes from './routes/paymentAdminRoutes.js';
import paymentUserRoutes from './routes/paymentUserRoutes.js';
import paymentFeedbackRoutes from './routes/paymentFeedbackRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import Registration from './models/Registration.js';
import Ticket from './models/Ticket.js';
import { startEventStartNotificationScheduler } from './jobs/eventStartNotifications.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'gatherup-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/lost-found', lostFoundRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/recommendations', recommendRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments/admin', paymentAdminRoutes);
app.use('/api/payments/me', paymentUserRoutes);
app.use('/api/payments/feedback', paymentFeedbackRoutes);
app.use('/api/announcements', announcementRoutes);

/** Central error handler */
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

async function start() {
  if (!process.env.JWT_SECRET) {
    console.warn('Warning: JWT_SECRET is not set — using insecure default for dev only');
    process.env.JWT_SECRET = 'dev-only-change-me';
  }
  await connectDB();
  // Align Registration collection indexes with the current schema and drop stale old indexes like qrCodeHash_1.
  try {
    await Registration.syncIndexes();
  } catch (e) {
    console.warn('Registration.syncIndexes:', e.message);
  }
  // Align Ticket collection indexes with schema (drops stale paths like registrationId_1 after renames)
  try {
    await Ticket.syncIndexes();
  } catch (e) {
    console.warn('Ticket.syncIndexes:', e.message);
  }
  startEventStartNotificationScheduler();

  app.listen(PORT, () => {
    console.log(`GatherUp API listening on http://localhost:${PORT}`);
  });
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
