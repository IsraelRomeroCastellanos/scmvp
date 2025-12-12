import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import clienteRoutes from './routes/cliente.routes';
import pool from './db';

const app = express();

app.use(cors());
app.use(express.json());

// HEALTH CHECK (antes de rutas)
app.get('/', (_req, res) => {
  res.status(200).send('OK');
});

// Ping simple sin BD
app.get('/api/ping', (_req, res) => {
  res.status(200).json({ ok: true });
});

// Ping BD (diagnóstico)
app.get('/api/ping-db', async (_req, res) => {
  try {
    const r = await pool.query('SELECT 1 as ok');
    res.status(200).json({ ok: true, db: r.rows[0] });
  } catch (e: any) {
    console.error('❌ ping-db failed:', e?.message || e);
    res.status(500).json({ ok: false, error: e?.message || 'db error' });
  }
});

app.use('/', authRoutes);
app.use('/', adminRoutes);
app.use('/', clienteRoutes);

export default app;
