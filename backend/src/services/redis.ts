import RedisModule from 'ioredis';

const Redis = RedisModule.default || RedisModule;

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const publisher = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('connect', () => {
  console.log('🔴 Connected to Redis');
});

redis.on('error', (err: Error) => {
  console.error('Redis error:', err);
});

interface UserPresenceData {
  username: string;
  avatarUrl?: string;
  cursorColor: string;
}

interface PresenceEntry extends UserPresenceData {
  userId: string;
  lastSeen: number;
}

interface RoomEvent<T = unknown> {
  event: string;
  data: T;
  timestamp: number;
}

// Presence tracking
export const setUserPresence = async (
  roomId: string,
  userId: string,
  userData: UserPresenceData
): Promise<void> => {
  const key = `room:${roomId}:presence`;
  await redis.hset(key, userId, JSON.stringify({ ...userData, lastSeen: Date.now() }));
  await redis.expire(key, 3600); // 1 hour TTL
};

export const removeUserPresence = async (roomId: string, userId: string): Promise<void> => {
  const key = `room:${roomId}:presence`;
  await redis.hdel(key, userId);
};

export const getRoomPresence = async (roomId: string): Promise<PresenceEntry[]> => {
  const key = `room:${roomId}:presence`;
  const presence = await redis.hgetall(key);
  return Object.entries(presence).map(([id, data]) => ({
    userId: id,
    ...JSON.parse(data),
  }));
};

// Pub/Sub for real-time updates
export const publishToRoom = async <T>(
  roomId: string,
  event: string,
  data: T
): Promise<void> => {
  const channel = `room:${roomId}`;
  await publisher.publish(channel, JSON.stringify({ event, data, timestamp: Date.now() }));
};

export const subscribeToRoom = (
  roomId: string,
  callback: (message: RoomEvent) => void
): (() => void) => {
  const channel = `room:${roomId}`;
  subscriber.subscribe(channel);
  subscriber.on('message', (ch: string, message: string) => {
    if (ch === channel) {
      callback(JSON.parse(message));
    }
  });
  return () => {
    subscriber.unsubscribe(channel);
  };
};

export { redis, subscriber, publisher };
export default redis;
