import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

console.log(process.env.DATABASE_URL);
const db = drizzle(process.env.DATABASE_URL!, { schema });
export { db };