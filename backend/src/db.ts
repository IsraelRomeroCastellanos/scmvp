// backend/src/db.ts
import { Pool } from 'pg';

// Render suele proveer DATABASE_URL. Si no existe, fallamos rápido con mensaje claro.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL no está definido en variables de entorno');
  // No hacemos process.exit aquí para no romper / (health check),
  // pero las rutas a BD fallarán rápido cuando intenten usar el pool.
}

// En Render (y muchos hosts) Postgres requiere SSL desde apps externas.
// Usamos SSL en producción por defecto.
const useSSL = (process.env.NODE_ENV === 'production') || Boolean(process.env.RENDER);

const pool = new Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
  // Evita “cuelgues” interminables al conectar
  connectionTimeoutMillis: 8000,
  idleTimeoutMillis: 30000,
  max: 10,
});

// Log simple para diagnosticar (se ve en Render logs)
pool.on('error', (err) => {
  console.error('❌ Error inesperado en pool de Postgres:', err);
});

export default pool;
