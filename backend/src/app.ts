import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import clienteRoutes from './routes/cliente.routes';

const app = express();

// ===============================
// MIDDLEWARES BÁSICOS
// ===============================
app.use(cors());
app.use(express.json());

// ===============================
// HEALTH CHECK (ANTES DE RUTAS)
// ===============================
app.get('/', (_req, res) => {
  res.status(200).send('OK');
});

// ===============================
// RUTAS DE LA APLICACIÓN
// ===============================
app.use('/', authRoutes);
app.use('/', adminRoutes);
app.use('/', clienteRoutes);

export default app;
