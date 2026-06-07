import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH ?? './data/app.db';
const absoluteDbPath = path.resolve(dbPath);

// Ensure the parent directory for the database exists
const dir = path.dirname(absoluteDbPath);
if (!fs.existsSync(dir)){
  fs.mkdirSync(dir, { recursive: true });
}

// Instantiate libsql local client
const client = createClient({
  url: `file:${absoluteDbPath}`,
});

export const db = drizzle(client, { schema });
export default db;
