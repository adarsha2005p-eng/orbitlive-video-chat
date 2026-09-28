import Redis from 'ioredis';
import { QueueUser } from '../types';

let redisClient: Redis | null = null;
let isRedisConnected = false;

// In-memory fallback if Redis is not running locally
class MemoryStore {
  private queue: QueueUser[] = [];
  private recentMatches: Map<string, number> = new Map(); // key: userA:userB -> timestamp
  private blocks: Map<string, Set<string>> = new Map(); // blockerId -> Set(blockedIds)
  private onlineUsers: Set<string> = new Set(); // set of socket IDs

  pushQueue(user: QueueUser): void {
    // Remove if already exists to prevent duplicate entry
    this.queue = this.queue.filter(u => u.socketId !== user.socketId && u.userId !== user.userId);
    this.queue.push(user);
  }

  popQueue(): QueueUser | null {
    return this.queue.shift() || null;
  }

  removeFromQueue(socketId: string): void {
    this.queue = this.queue.filter(u => u.socketId !== socketId);
  }

  getQueue(): QueueUser[] {
    return [...this.queue];
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  recordRecentMatch(userA: string, userB: string, ttlSeconds = 60): void {
    const key1 = `${userA}:${userB}`;
    const key2 = `${userB}:${userA}`;
    const expireAt = Date.now() + ttlSeconds * 1000;
    this.recentMatches.set(key1, expireAt);
    this.recentMatches.set(key2, expireAt);
  }

  isRecentMatch(userA: string, userB: string): boolean {
    const key = `${userA}:${userB}`;
    const expireAt = this.recentMatches.get(key);
    if (!expireAt) return false;
    if (Date.now() > expireAt) {
      this.recentMatches.delete(key);
      this.recentMatches.delete(`${userB}:${userA}`);
      return false;
    }
    return true;
  }

  addBlock(blockerId: string, blockedId: string): void {
    if (!this.blocks.has(blockerId)) {
      this.blocks.set(blockerId, new Set());
    }
    this.blocks.get(blockerId)!.add(blockedId);
  }

  isBlocked(userA: string, userB: string): boolean {
    const aBlocksB = this.blocks.get(userA)?.has(userB) ?? false;
    const bBlocksA = this.blocks.get(userB)?.has(userA) ?? false;
    return aBlocksB || bBlocksA;
  }

  setOnline(socketId: string): void {
    this.onlineUsers.add(socketId);
  }

  removeOnline(socketId: string): void {
    this.onlineUsers.delete(socketId);
  }

  getOnlineCount(): number {
    return this.onlineUsers.size;
  }
}

const memoryStore = new MemoryStore();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isTls = redisUrl.startsWith('rediss://');

try {
  const redisOptions: any = {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    retryStrategy: (times: number) => {
      // Exponential backoff up to 2 seconds, retries indefinitely in background
      return Math.min(times * 150, 2000);
    },
    lazyConnect: true,
  };

  if (isTls) {
    redisOptions.tls = {
      rejectUnauthorized: false,
    };
  }

  redisClient = new Redis(redisUrl, redisOptions);

  redisClient.connect()
    .then(() => {
      isRedisConnected = true;
      console.log('✅ [Redis] Connected successfully to', redisUrl.replace(/:[^:@]+@/, ':****@'));
    })
    .catch((err) => {
      console.warn('⚠️ [Redis] Initial connection notice:', err.message);
      isRedisConnected = false;
    });

  redisClient.on('connect', () => {
    isRedisConnected = true;
  });

  redisClient.on('ready', () => {
    isRedisConnected = true;
  });

  redisClient.on('close', () => {
    isRedisConnected = false;
  });

  redisClient.on('error', (err) => {
    isRedisConnected = false;
  });
} catch (err) {
  console.warn('⚠️ [Redis] Error initializing Redis client. Using in-memory fallback.');
}

export const RedisQueue = {
  async addToQueue(user: QueueUser): Promise<void> {
    if (isRedisConnected && redisClient) {
      try {
        await this.removeFromQueue(user.socketId);
        await redisClient.rpush('matchmaking:queue', JSON.stringify(user));
        return;
      } catch (e) {
        // Fallback
      }
    }
    memoryStore.pushQueue(user);
  },

  async popFromQueue(): Promise<QueueUser | null> {
    if (isRedisConnected && redisClient) {
      try {
        const item = await redisClient.lpop('matchmaking:queue');
        if (item) {
          return JSON.parse(item) as QueueUser;
        }
        return null;
      } catch (e) {
        // Fallback
      }
    }
    return memoryStore.popQueue();
  },

  async removeFromQueue(socketId: string): Promise<void> {
    if (isRedisConnected && redisClient) {
      try {
        const items = await redisClient.lrange('matchmaking:queue', 0, -1);
        for (const item of items) {
          const user = JSON.parse(item) as QueueUser;
          if (user.socketId === socketId) {
            await redisClient.lrem('matchmaking:queue', 0, item);
          }
        }
        return;
      } catch (e) {
        // Fallback
      }
    }
    memoryStore.removeFromQueue(socketId);
  },

  async getQueueLength(): Promise<number> {
    if (isRedisConnected && redisClient) {
      try {
        return await redisClient.llen('matchmaking:queue');
      } catch (e) {
        // Fallback
      }
    }
    return memoryStore.getQueueLength();
  },

  async getFullQueue(): Promise<QueueUser[]> {
    if (isRedisConnected && redisClient) {
      try {
        const items = await redisClient.lrange('matchmaking:queue', 0, -1);
        return items.map(i => JSON.parse(i));
      } catch (e) {
        // Fallback
      }
    }
    return memoryStore.getQueue();
  },

  async recordRecentMatch(userA: string, userB: string, ttlSeconds = 60): Promise<void> {
    if (isRedisConnected && redisClient) {
      try {
        await redisClient.set(`recent:${userA}:${userB}`, '1', 'EX', ttlSeconds);
        await redisClient.set(`recent:${userB}:${userA}`, '1', 'EX', ttlSeconds);
        return;
      } catch (e) {
        // Fallback
      }
    }
    memoryStore.recordRecentMatch(userA, userB, ttlSeconds);
  },

  async isRecentMatch(userA: string, userB: string): Promise<boolean> {
    if (isRedisConnected && redisClient) {
      try {
        const match = await redisClient.get(`recent:${userA}:${userB}`);
        return !!match;
      } catch (e) {
        // Fallback
      }
    }
    return memoryStore.isRecentMatch(userA, userB);
  },

  async addBlock(blockerId: string, blockedId: string): Promise<void> {
    if (isRedisConnected && redisClient) {
      try {
        await redisClient.sadd(`blocks:${blockerId}`, blockedId);
        return;
      } catch (e) {
        // Fallback
      }
    }
    memoryStore.addBlock(blockerId, blockedId);
  },

  async isBlocked(userA: string, userB: string): Promise<boolean> {
    if (isRedisConnected && redisClient) {
      try {
        const aBlockedB = await redisClient.sismember(`blocks:${userA}`, userB);
        const bBlockedA = await redisClient.sismember(`blocks:${userB}`, userA);
        return aBlockedB === 1 || bBlockedA === 1;
      } catch (e) {
        // Fallback
      }
    }
    return memoryStore.isBlocked(userA, userB);
  },

  async setOnline(socketId: string, userId?: string): Promise<void> {
    if (isRedisConnected && redisClient) {
      try {
        await redisClient.sadd('online:sockets', socketId);
        if (userId) await redisClient.set(`online:user:${userId}`, socketId, 'EX', 86400);
        return;
      } catch (e) {
        // Fallback
      }
    }
    memoryStore.setOnline(socketId);
  },

  async removeOnline(socketId: string, userId?: string): Promise<void> {
    if (isRedisConnected && redisClient) {
      try {
        await redisClient.srem('online:sockets', socketId);
        if (userId) await redisClient.del(`online:user:${userId}`);
        return;
      } catch (e) {
        // Fallback
      }
    }
    memoryStore.removeOnline(socketId);
  },

  async getOnlineCount(): Promise<number> {
    if (isRedisConnected && redisClient) {
      try {
        return await redisClient.scard('online:sockets');
      } catch (e) {
        // Fallback
      }
    }
    return memoryStore.getOnlineCount();
  }
};

export default redisClient;
