const Redis = require('ioredis');

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

const redisOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  retryStrategy(times) {
    return Math.min(times * 100, 3000);
  },
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

const pubClient = new Redis(redisOptions);
const subClient = pubClient.duplicate();
const redisPresence = pubClient.duplicate();

module.exports = {
  pubClient,
  subClient,
  redisPresence,
};
