import mongoose from 'mongoose';

/**
 * Connects to MongoDB using the shared root MONGO_URI. Retries a few times on transient failures.
 */
export async function connectDB() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set');
  }
  mongoose.set('strictQuery', true);
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await mongoose.connect(uri);
      console.log('MongoDB connected');
      return;
    } catch (err) {
      console.error(`MongoDB connection attempt ${attempt}/${maxAttempts} failed:`, err.message);
      if (attempt === maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}
