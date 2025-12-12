// backend/src/main.ts
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import clienteRoutes from './routes/cliente.routes';

const app = express();

// ===============================
// CONFIG
// ===============================
const PORT = process.env.PORT || 3001;

// ===============================
// MIDDLEWARES
// ===============================
app.use(cors());
app.use(express.json());

// ===============================
// RUTAS
// ===============================
app.use('/', authRoutes);
app.use('/', adminRoutes);
app.use('/', clienteRoutes);

// ===============================
// HEALTH CHECK
// ===============================
app.get('/', (_req, res) => {
  res.send('SCMVP backend running');
});

// ===============================
// START SERVER
// ===============================
app.listen(PORT, () => {
  console.log(`🚀 SCMVP backend listening on port ${PORT}`);
});
