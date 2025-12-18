import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import clienteRoutes from './routes/cliente.routes';

const app = express();

/**
 * ===============================
 * Middlewares globales
 * ===============================
 */
app.use(cors());
app.use(express.json());

/**
 * ===============================
 * Health check
 * ===============================
 */
app.get('/', (_req, res) => {
  res.json({ ok: true });
});

/**
 * ===============================
 * Rutas del sistema
 * ===============================
 */
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);   // ✅ ESTA ES LA CLAVE
app.use('/api/cliente', clienteRoutes);

export default app;
