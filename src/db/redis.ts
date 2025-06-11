import * as redis from "redis";

export const createClient = () =>
  redis.createClient({
    url: process.env.REDIS_URL!,
    password: process.env.REDIS_PASSWORD!,
  });
