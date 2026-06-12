/**
 * Optional seed script: demo admin, student, categories, venue, sample event.
 * Run: npm run seed (from backend/) after .env is configured.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Venue from '../models/Venue.js';
import Event from '../models/Event.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  console.log('Connected');

  const adminEmail = 'admin@gatherup.edu';
  const studentEmail = 'student@gatherup.edu';

  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      email: adminEmail,
      password: 'Admin123!',
      name: 'Campus Admin',
      role: 'admin',
    });
    console.log('Created admin:', adminEmail, '/ Admin123!');
  } else {
    console.log('Admin exists:', adminEmail);
  }

  let student = await User.findOne({ email: studentEmail });
  if (!student) {
    student = await User.create({
      email: studentEmail,
      password: 'Student123!',
      name: 'Alex Student',
      role: 'student',
    });
    console.log('Created student:', studentEmail, '/ Student123!');
  }

  for (const c of [
    { name: 'Workshop', description: 'Hands-on learning' },
    { name: 'Concert', description: 'Music & performance' },
    { name: 'Sports', description: 'Athletics' },
  ]) {
    await Category.updateOne({ name: c.name }, { $setOnInsert: c }, { upsert: true });
  }
  console.log('Categories ensured');

  let venue = await Venue.findOne({ name: 'Grand Hall A' });
  if (!venue) {
    venue = await Venue.create({
      name: 'Grand Hall A',
      location: 'Student Union — 2nd floor',
      capacity: 120,
    });
  }

  const existingEvent = await Event.findOne({ title: 'Welcome Week Mixer' });
  if (!existingEvent) {
    let cat = await Category.findOne({ name: 'Workshop' });
    if (!cat) {
      cat = await Category.findOne();
    }
    const start = new Date();
    start.setDate(start.getDate() + 7);
    start.setHours(18, 0, 0, 0);
    const end = new Date(start);
    end.setHours(21, 0, 0, 0);
    if (!cat) {
      console.error('No category found — create a category first');
    } else {
      await Event.create({
        title: 'Welcome Week Mixer',
        description: 'Meet clubs, grab snacks, win prizes.',
        category: cat._id,
        venue: venue._id,
        startDateTime: start,
        endDateTime: end,
        capacity: 100,
        createdBy: admin._id,
      });
      console.log('Sample event created');
    }
  }

  console.log('Seed complete.');
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
