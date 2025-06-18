import * as redis from "redis";
import env from "../lib/env";

export const createClient = () =>
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
    await client.disconnect();
    return { success: true };
  } catch (error) {
    try {
      await client.disconnect();
    } catch (disconnectError) {
      // Ignore disconnect errors if connection failed
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown Redis connection error" 
    };
  }
};
