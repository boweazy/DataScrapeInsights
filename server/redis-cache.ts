import Redis from 'ioredis';

let redis: Redis | null = null;

// Initialize Redis connection
export function initializeRedis(config?: {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
}): Redis {
  if (redis) {
    return redis;
  }

  const redisConfig = {
    host: config?.host || process.env.REDIS_HOST || 'localhost',
    port: config?.port || parseInt(process.env.REDIS_PORT || '6379'),
    password: config?.password || process.env.REDIS_PASSWORD,
    db: config?.db || parseInt(process.env.REDIS_DB || '0'),
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  };

  redis = new Redis(redisConfig);

  redis.on('connect', () => {
    console.log('[Redis] Connected to Redis server');
  });

  redis.on('error', (error) => {
    console.error('[Redis] Connection error:', error);
  });

  redis.on('ready', () => {
    console.log('[Redis] Redis client is ready');
  });

  return redis;
}

// Get Redis instance
export function getRedis(): Redis {
  if (!redis) {
    // Initialize with defaults if not already initialized
    return initializeRedis();
  }
  return redis;
}

// Close Redis connection
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    console.log('[Redis] Connection closed');
  }
}

// Cache wrapper with TTL
export class CacheManager {
  private redis: Redis;
  private defaultTTL: number;

  constructor(ttl: number = 3600) {
    this.redis = getRedis();
    this.defaultTTL = ttl; // Default 1 hour
  }

  // Set a value with optional TTL
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    const expiry = ttl || this.defaultTTL;

    if (expiry > 0) {
      await this.redis.setex(key, expiry, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  // Get a value
  async get<T = any>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as any;
    }
  }

  // Delete a key
  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  // Get or set pattern
  async getOrSet<T = any>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);

    if (cached !== null) {
      console.log(`[Cache] HIT: ${key}`);
      return cached;
    }

    console.log(`[Cache] MISS: ${key}`);

    // Fetch fresh data
    const fresh = await fetcher();

    // Store in cache
    await this.set(key, fresh, ttl);

    return fresh;
  }

  // Delete keys by pattern
  async deletePattern(pattern: string): Promise<number> {
    const keys = await this.redis.keys(pattern);

    if (keys.length === 0) {
      return 0;
    }

    return await this.redis.del(...keys);
  }

  // Increment a counter
  async increment(key: string, amount: number = 1): Promise<number> {
    return await this.redis.incrby(key, amount);
  }

  // Decrement a counter
  async decrement(key: string, amount: number = 1): Promise<number> {
    return await this.redis.decrby(key, amount);
  }

  // Set expiry on a key
  async expire(key: string, seconds: number): Promise<void> {
    await this.redis.expire(key, seconds);
  }

  // Get TTL of a key
  async ttl(key: string): Promise<number> {
    return await this.redis.ttl(key);
  }

  // Add to a set
  async addToSet(key: string, ...members: string[]): Promise<number> {
    return await this.redis.sadd(key, ...members);
  }

  // Get all members of a set
  async getSet(key: string): Promise<string[]> {
    return await this.redis.smembers(key);
  }

  // Check if member is in set
  async isInSet(key: string, member: string): Promise<boolean> {
    const result = await this.redis.sismember(key, member);
    return result === 1;
  }

  // Add to sorted set with score
  async addToSortedSet(key: string, score: number, member: string): Promise<number> {
    return await this.redis.zadd(key, score, member);
  }

  // Get top N from sorted set
  async getTopFromSortedSet(key: string, count: number): Promise<string[]> {
    return await this.redis.zrevrange(key, 0, count - 1);
  }

  // Publish to channel
  async publish(channel: string, message: any): Promise<number> {
    const serialized = JSON.stringify(message);
    return await this.redis.publish(channel, serialized);
  }

  // Subscribe to channel
  subscribe(channel: string, callback: (message: any) => void): void {
    const subscriber = this.redis.duplicate();

    subscriber.subscribe(channel, (err) => {
      if (err) {
        console.error(`[Redis] Subscribe error:`, err);
      } else {
        console.log(`[Redis] Subscribed to channel: ${channel}`);
      }
    });

    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          const parsed = JSON.parse(message);
          callback(parsed);
        } catch {
          callback(message);
        }
      }
    });
  }

  // Get cache statistics
  async getStats(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
    keys: number;
  }> {
    const info = await this.redis.info('stats');
    const keyspace = await this.redis.info('keyspace');

    // Parse Redis info output
    const statsMatch = info.match(/keyspace_hits:(\d+)/);
    const missesMatch = info.match(/keyspace_misses:(\d+)/);

    const hits = statsMatch ? parseInt(statsMatch[1]) : 0;
    const misses = missesMatch ? parseInt(missesMatch[1]) : 0;
    const total = hits + misses;
    const hitRate = total > 0 ? (hits / total) * 100 : 0;

    // Count keys
    const keys = await this.redis.dbsize();

    return {
      hits,
      misses,
      hitRate: Math.round(hitRate * 100) / 100,
      keys,
    };
  }

  // Flush all cache
  async flushAll(): Promise<void> {
    await this.redis.flushdb();
    console.log('[Redis] Cache flushed');
  }
}

// Create default cache instance
export const cache = new CacheManager();

// Cache key builders
export const CacheKeys = {
  stats: () => 'stats:dashboard',
  scrapers: () => 'scrapers:all',
  scraper: (id: number) => `scraper:${id}`,
  queries: (saved: boolean, limit: number) => `queries:${saved}:${limit}`,
  query: (id: number) => `query:${id}`,
  socialMedia: (platform?: string, limit: number = 50) =>
    platform ? `social:${platform}:${limit}` : `social:all:${limit}`,
  activities: (limit: number) => `activities:${limit}`,
  analytics: () => 'analytics:dashboard',
  predictions: (metric: string, days: number) => `predictions:${metric}:${days}`,
  anomalies: (threshold: number) => `anomalies:${threshold}`,
  recommendations: () => 'recommendations:smart',
  performance: () => 'performance:metrics',
  export: (id: number) => `export:${id}`,
};

// Cache invalidation helpers
export const CacheInvalidation = {
  onScraperChange: async () => {
    await cache.deletePattern('scraper:*');
    await cache.deletePattern('scrapers:*');
    await cache.del(CacheKeys.stats());
  },

  onQueryChange: async () => {
    await cache.deletePattern('query:*');
    await cache.deletePattern('queries:*');
    await cache.del(CacheKeys.stats());
  },

  onDataChange: async () => {
    await cache.del(CacheKeys.stats());
    await cache.del(CacheKeys.analytics());
    await cache.deletePattern('predictions:*');
  },

  onActivityChange: async () => {
    await cache.deletePattern('activities:*');
    await cache.deletePattern('anomalies:*');
    await cache.del(CacheKeys.recommendations());
  },

  all: async () => {
    await cache.flushAll();
  },
};

// Distributed lock using Redis
export class DistributedLock {
  private redis: Redis;
  private lockKey: string;
  private lockValue: string;
  private ttl: number;

  constructor(lockName: string, ttl: number = 30) {
    this.redis = getRedis();
    this.lockKey = `lock:${lockName}`;
    this.lockValue = `${Date.now()}-${Math.random()}`;
    this.ttl = ttl;
  }

  async acquire(): Promise<boolean> {
    const result = await this.redis.set(
      this.lockKey,
      this.lockValue,
      'EX',
      this.ttl,
      'NX'
    );
    return result === 'OK';
  }

  async release(): Promise<boolean> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await this.redis.eval(script, 1, this.lockKey, this.lockValue);
    return result === 1;
  }

  async extend(additionalTTL: number): Promise<boolean> {
    const result = await this.redis.expire(this.lockKey, this.ttl + additionalTTL);
    return result === 1;
  }
}
