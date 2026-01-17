import { createClient, RedisClientOptions, RedisClientType } from 'redis';

import { logger } from '@/server';

import { env } from './envConfig';

// Define the type for Redis modules and functions if any
type RedisModules = Record<string, never>;
type RedisFunctions = Record<string, never>;
type RedisScripts = Record<string, never>;

// Define Redis client type with the specified modules, functions, and scripts
type RedisClient = RedisClientType<RedisModules, RedisFunctions, RedisScripts>;

// Redis client options with proper type definitions
const redisClientOptions: RedisClientOptions<RedisModules, RedisFunctions, RedisScripts> = {
  username: env.REDIS_USERNAME,
  password: env.REDIS_PASSWORD,
  socket: {
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT),
    reconnectStrategy: (retries: number) => {
      logger.info(`Reconnect attempt number: ${retries}`);
      if (retries >= 20) {
        logger.error('Max reconnection attempts reached. Giving up.');
        return new Error('Max reconnection attempts reached');
      }
      const delay = Math.min(retries * 100, 3000) + 1000; // Increase retry delay up to a maximum
      logger.warn(`Redis reconnect attempt ${retries}, retrying in ${delay} ms`);
      return delay;
    },
    connectTimeout: 20000, // Timeout for the connection in milliseconds
    tls: env.REDIS_TLS,
  },
};

// Create the Redis client using the defined options
const redisClient: RedisClient = createClient(redisClientOptions);

// Event handlers for the Redis client
redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

redisClient.on('error', (err: any) => {
  logger.error('Error connecting to Redis:', err);
  if (err.message.includes('ECONNREFUSED')) {
    logger.error('Redis connection refused - check if the redis server is installed and running');
    process.exit(1); // Exit the process on connection refusal
  }
});

redisClient.on('reconnecting', () => {
  logger.info('Reconnecting to Redis...');
});

redisClient.on('end', () => {
  logger.warn('Redis connection has been closed');
});

// Function to initialize the connection and handle errors
(async () => {
  try {
    await redisClient.connect();
  } catch (err: any) {
    logger.error('Failed to connect to Redis:', err);
    process.exit(1); // Exit the process if connection is critical
  }
})();

export default redisClient;
