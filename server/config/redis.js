import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

const connectRedis = async () => {
    redis.on('connect', () => console.log('Redis Connected'));
    redis.on('error', err => console.error('Redis Client Error', err));

    await redis.connect();
};

export { redis };

export default connectRedis;