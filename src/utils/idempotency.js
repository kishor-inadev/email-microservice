const logger = require('./logger');

/**
 * In-memory idempotency store (replace with Redis in production)
 */
class IdempotencyStore {
  constructor() {
    this.store = new Map();
    this.ttl = parseInt(process.env.IDEMPOTENCY_TTL_MS) || 3600000; // 1 hour
    this.cleanupInterval = parseInt(process.env.IDEMPOTENCY_CLEANUP_INTERVAL_MS) || 300000; // 5 minutes

    // Start cleanup interval
    this.startCleanupInterval();

    logger.info('Idempotency store initialized', {
      ttl: this.ttl,
      cleanupInterval: this.cleanupInterval,
      implementation: 'in-memory'
    });
  }

  /**
   * Check if key already exists (duplicate request)
   */
  async checkDuplicate(key) {
    if (!key) return false;

    const entry = this.store.get(key);
    if (!entry) return false;

    // Check if entry is expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    logger.debug('Duplicate idempotency key detected', { key });
    return true;
  }

  /**
   * Mark key as processed
   */
  async markAsProcessed(key) {
    if (!key) return;

    const expiresAt = Date.now() + this.ttl;
    this.store.set(key, {
      processedAt: Date.now(),
      expiresAt
    });

    logger.debug('Idempotency key marked as processed', { key, expiresAt });
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Idempotency store cleanup completed', {
        cleaned,
        remaining: this.store.size
      });
    }
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Get store stats
   */
  getStats() {
    return {
      totalKeys: this.store.size,
      ttl: this.ttl,
      cleanupInterval: this.cleanupInterval
    };
  }

  /**
   * Clear all keys (for testing)
   */
  clear() {
    this.store.clear();
    logger.debug('Idempotency store cleared');
  }
}

/**
 * Redis-based idempotency store (for production)
 */
class RedisIdempotencyStore {
  constructor(redisClient) {
    this.redis = redisClient;
    this.ttl = parseInt(process.env.IDEMPOTENCY_TTL_MS) || 3600000;

    logger.info('Redis idempotency store initialized', {
      ttl: this.ttl,
      implementation: 'redis'
    });
  }

  async checkDuplicate(key) {
    if (!key) return false;

    try {
      const exists = await this.redis.exists(`idempotency:${key}`);
      return exists === 1;
    } catch (error) {
      logger.error('Redis idempotency check failed', { key, error: error.message });
      // Fail open - allow request to proceed
      return false;
    }
  }

  async markAsProcessed(key) {
    if (!key) return;

    try {
      await this.redis.setex(
        `idempotency:${key}`,
        Math.floor(this.ttl / 1000), // Redis expects seconds
        JSON.stringify({
          processedAt: Date.now(),
          expiresAt: Date.now() + this.ttl
        })
      );
    } catch (error) {
      logger.error('Redis idempotency mark failed', { key, error: error.message });
      // Don't throw - this is not critical
    }
  }

  getStats() {
    return {
      implementation: 'redis',
      ttl: this.ttl
    };
  }

  clear() {
    // Implementation would depend on Redis client
    logger.warn('Redis idempotency clear not implemented');
  }
}

// Choose implementation based on environment
let idempotencyStore;

if (process.env.REDIS_URL) {
  // Redis implementation (uncomment when Redis is available)
  /*
  const redis = require('redis');
  const redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD
  });

  redisClient.connect().then(() => {
    logger.info('Redis connected for idempotency');
    idempotencyStore = new RedisIdempotencyStore(redisClient);
  }).catch(error => {
    logger.error('Redis connection failed, falling back to in-memory', { error: error.message });
    idempotencyStore = new IdempotencyStore();
  });
  */

  // For now, fall back to in-memory
  logger.warn('Redis URL provided but Redis client not implemented, using in-memory store');
  idempotencyStore = new IdempotencyStore();
} else {
  idempotencyStore = new IdempotencyStore();
}

module.exports = idempotencyStore;
