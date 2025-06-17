import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import env from '../lib/env';

const db = drizzle(env.DATABASE_URL, { schema });
export { db };