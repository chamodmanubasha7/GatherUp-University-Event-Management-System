/**
 * One-time migration: legacy single `date` field → `startDateTime` + `endDateTime`.
 * Run from backend/: `npm run migrate:event-dates`
 *
 * Defaults: start = 09:00 UTC on that calendar day, end = 17:00 UTC same day.
 * Adjust in the script if your historical data used different conventions.
 */
import 'dotenv/config';
import mongoose from 'mongoose';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const coll = mongoose.connection.db.collection('events');

  const cursor = coll.find({
    date: { $exists: true, $ne: null },
    $or: [{ startDateTime: { $exists: false } }, { startDateTime: null }],
  });

  let n = 0;
  for await (const doc of cursor) {
    const raw = doc.date;
    const d = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(d.getTime())) continue;

    const startDateTime = new Date(d);
    startDateTime.setUTCHours(9, 0, 0, 0);
    const endDateTime = new Date(d);
    endDateTime.setUTCHours(17, 0, 0, 0);
    if (endDateTime <= startDateTime) {
      endDateTime.setUTCHours(startDateTime.getUTCHours() + 2, 0, 0, 0);
    }

    await coll.updateOne(
      { _id: doc._id },
      {
        $set: { startDateTime, endDateTime },
        $unset: { date: '' },
      }
    );
    n += 1;
    console.log('Migrated event', doc._id, doc.title || '');
  }

  console.log(`Done. Updated ${n} event(s).`);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
