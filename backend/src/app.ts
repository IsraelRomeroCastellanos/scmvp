import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import clienteRoutes from './routes/cliente.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use(adminRoutes);
console.log('Cliente routes mounted');
app.use('/api/cliente', clienteRoutes);

export default app;
