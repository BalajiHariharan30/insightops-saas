import { Redis } from '@upstash/redis';
import { config } from '../../config';
import { logger } from '../../config/logger';

// Initialize the Upstash Redis HTTP client using credentials loaded from Zod config
let redis: Redis;

try {
  redis = new Redis({
    url: config.REDIS_URL,
    token: config.REDIS_TOKEN,
  });
  logger.info('💚 Upstash Redis client initialized successfully.');
} catch (error) {
  logger.error('❌ Failed to initialize Upstash Redis client:', error);
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key);
    if (!cached) return null;
    
    // Upstash automatically parses JSON if it was saved as an object, 
    // but in case it's a string, we handle parsing defensively.
    if (typeof cached === 'string') {
      return JSON.parse(cached) as T;
    }
    return cached as T;
  } catch (error) {
    logger.warn(`Redis get cache error for key [${key}]:`, error);
    return null; // Fallback to DB on cache failure (resiliency)
  }
}

export async function setCachedData<T>(key: string, data: T, ttlSeconds = 300): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(data), { ex: ttlSeconds });
  } catch (error) {
    logger.warn(`Redis set cache error for key [${key}]:`, error);
  }
}

export async function invalidateCachePattern(organizationId: string, pattern: string): Promise<void> {
  try {
    // Upstash Redis supports scan/keys pattern matching
    const matchPattern = `org:${organizationId}:${pattern}`;
    const keys = await redis.keys(matchPattern);
    
    if (keys && keys.length > 0) {
      await redis.del(...keys);
      logger.info(`Invalidated ${keys.length} cache keys matching [${matchPattern}]`);
    }
  } catch (error) {
    logger.warn(`Redis cache invalidation error for organization [${organizationId}] and pattern [${pattern}]:`, error);
  }
}
