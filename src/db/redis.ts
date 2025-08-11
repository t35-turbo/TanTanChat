import * as redis from "redis";
import env from "../lib/env";

export const createClient = (): redis.RedisClientType =>
  redis.createClient({
    url: env.REDIS_URL,
    password: env.REDIS_PASSWORD,
  });

/**
 * Test Redis connection by creating a client, connecting, and performing a simple ping
 */
export const testConnection = async (): Promise<{ success: boolean; error?: string }> => {
  const client = createClient();

  try {
    await client.connect();
    await client.ping();
    client.destroy();
    return { success: true };
  } catch (error) {
    client.destroy();
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown Redis connection error",
    };
  }
};
