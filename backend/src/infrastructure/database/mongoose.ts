import mongoose from 'mongoose';
import { config } from '../../config';
import { seedDatabase } from './seed';

export async function connectDatabase(): Promise<void> {
  const uri = config.MONGODB_URI;

  mongoose.connection.on('connected', () => {
    console.log('💚 Connected to MongoDB Atlas successfully.');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB database connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB connection disconnected.');
  });

  try {
    // Attempt connecting to the configured URI with a 5s timeout
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    await seedDatabase();
  } catch (err) {
    console.warn('⚠️ Remote MongoDB connection failed or timed out. Falling back to in-memory Mongo database for development...');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const memoryUri = mongod.getUri();
    await mongoose.connect(memoryUri);
    console.log('💚 Connected to In-Memory MongoDB Server:', memoryUri);
    await seedDatabase();
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
