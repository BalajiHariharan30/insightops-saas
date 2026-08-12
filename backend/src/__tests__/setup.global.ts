/**
 * Global Test Setup — Runs ONCE before all test suites
 * Starts an in-memory MongoDB instance so tests don't touch your real Atlas database
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';
import path from 'path';

let mongoServer: MongoMemoryServer;

module.exports = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Store URI in a temp file so individual test suites can read it
  const tempPath = path.join(__dirname, '.test-mongo-uri.tmp');
  fs.writeFileSync(tempPath, uri);

  // Store reference globally for teardown
  (global as any).__MONGOSERVER__ = mongoServer;

  console.log('\n🧪 In-memory MongoDB started for test suite');
};
