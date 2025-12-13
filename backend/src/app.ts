import express, { Request, Response } from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import clienteRoutes from './routes/cliente.routes';
import pool from './db';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

// Ping simple
app.get('/api/ping', (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

// Ping DB
app.get('/api/ping-db', async (_req: Request, res: Response) => {
  try {
    const r = await pool.query('SELECT 1 as ok');
    res.status(200).json({ ok: true, db: r.rows[0] });
  } catch (e: any) {
    console.error('ping-db error:', e);
    res.status(500).json({ ok: false, error: 'db error' });
  }
});

app.use('/', authRoutes);
app.use('/', adminRoutes);
app.use('/', clienteRoutes);

export default app;
