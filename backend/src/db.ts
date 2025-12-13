// backend/src/db.ts
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : undefined,
  connectionTimeoutMillis: 8000,
  idleTimeoutMillis: 30000
});

pool.on('error', (err: Error) => {
  console.error('Unexpected PG error', err);
});

export default pool;
