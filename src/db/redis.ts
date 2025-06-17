import * as redis from "redis";
import env from "../lib/env";

export const createClient = () =>
  redis.createClient({
    url: env.REDIS_URL,
    password: env.REDIS_PASSWORD,
  });
