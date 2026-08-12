/**
 * Environment variable overrides for the test environment.
 * These replace real external service credentials with safe test values.
 * Runs before every test file via Jest setupFiles.
 */
import fs from 'fs';
import path from 'path';

// Override MongoDB URI with in-memory server URI
const tempPath = path.join(__dirname, '.test-mongo-uri.tmp');
if (fs.existsSync(tempPath)) {
  process.env.MONGODB_URI = fs.readFileSync(tempPath, 'utf-8').trim();
}

// Override JWT with a predictable test secret
process.env.JWT_SECRET = 'test_jwt_secret_for_unit_tests_only_32chars';
process.env.NODE_ENV = 'test';
process.env.PORT = '10001'; // Don't clash with the running dev server

// Replace Redis with noop mock (no real Upstash calls in tests)
process.env.UPSTASH_REDIS_REST_URL = 'http://localhost:6379-test';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token-noop';

// Replace Stripe with test key
process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_placeholder';

// Replace AI key
process.env.AI_API_KEY = 'test-ai-key';

// Replace Google OAuth
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';

process.env.FRONTEND_URL = 'http://localhost:3000';
