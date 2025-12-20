import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import clienteRoutes from './routes/cliente.routes';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// Logging de requests (útil en Render)
app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  next();
});

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Auth
app.use('/api/auth', authRoutes);

// ✅ IMPORTANTE: Admin montado con prefijo /api/admin
app.use('/api/admin', adminRoutes);

// Cliente
app.use('/api/cliente', clienteRoutes);

export default app;
