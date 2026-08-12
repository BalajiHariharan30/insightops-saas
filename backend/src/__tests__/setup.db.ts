import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

beforeAll(async () => {
  const tempPath = path.join(__dirname, '.test-mongo-uri.tmp');
  let uri = process.env.MONGODB_URI;
  if (fs.existsSync(tempPath)) {
    uri = fs.readFileSync(tempPath, 'utf-8').trim();
  }

  if (mongoose.connection.readyState === 0 && uri) {
    await mongoose.connect(uri);
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});
