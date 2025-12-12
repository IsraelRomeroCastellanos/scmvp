// backend/src/main.ts
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import clienteRoutes from './routes/cliente.routes';

const app = express();

// ===============================
// MIDDLEWARES
// ===============================
app.use(cors());
app.use(express.json());

// ===============================
// RUTAS
// ===============================
// IMPORTANTE: usamos '/' porque las rutas
// YA incluyen /api/...
app.use('/', authRoutes);
app.use('/', adminRoutes);
app.use('/', clienteRoutes);

// ===============================
// HEALTH CHECK
// ===============================
app.get('/', (_req, res) => {
  res.send('SCMVP backend running');
});

export default app;
