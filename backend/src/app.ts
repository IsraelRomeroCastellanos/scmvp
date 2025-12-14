import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import clienteRoutes from './routes/cliente.routes';

const app = express();

app.use(cors());
app.use(express.json());

// Health
app.get('/', (_req, res) => {
  res.json({ ok: true });
});

// 🔐 Auth
app.use('/api/auth', authRoutes);

// 🏢 Admin (empresas, usuarios, etc.)
app.use('/api/admin', adminRoutes);

// 👤 Cliente
app.use('/api/cliente', clienteRoutes);

export default app;
