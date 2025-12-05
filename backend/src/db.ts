// backend/src/db.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Verificar conexión
pool.on('connect', () => {
  console.log('✅ Conexión a base de datos establecida');
});

pool.on('error', (err) => {
  console.error('❌ Error en conexión de base de datos:', err);
  process.exit(-1);
});

export default pool;