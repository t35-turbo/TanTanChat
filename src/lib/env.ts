import z from "zod/v4";

export const EnvZod = z.object({
  // PostgreSQL Configuration
  POSTGRES_DB: z.string(),
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_PORT: z.coerce.number().default(5432),

  // Redis Configuration
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string(),

  // BetterAuth Configuration
  BETTER_AUTH_SECRET: z.string(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),

  // Server Configuration
  SERVER_PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PRODUCTION_DOMAIN: z.string().optional(),

  // Database Connection URLs
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),

  // File Storage Configuration
  USE_S3: z.coerce.boolean().default(false),
  LOCAL_FILE_STORE_PATH: z.string().default("./file_store"),
})
export type Env = z.infer<typeof EnvZod>;

const parsed = EnvZod.parse(process.env);
export default parsed;