import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import clienteRoutes from './routes/cliente.routes';

const app = express();

// Middlewares base
app.use(cors({ origin: '*' }));
app.use(express.json());

// Logging de requests (útil para Render)
app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  next();
});

// Healthcheck simple
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Rutas
app.use('/api/auth', authRoutes);

// OJO: tu adminRoutes probablemente ya incluye el prefijo /api/admin internamente
// por eso antes lo tenías como app.use(adminRoutes)
app.use(adminRoutes);

app.use('/api/cliente', clienteRoutes);

export default app;
