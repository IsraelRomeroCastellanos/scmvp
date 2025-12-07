// backend/src/main.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import fileUpload from 'express-fileupload';

// Importaciones de Rutas (Ahora usan importación por defecto)
import authRoutes from './routes/auth.routes';
import clienteRoutes from './routes/cliente.routes';
import adminRoutes from './routes/admin.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

// --- INICIO: CÓDIGO REFRACTORIZADO PARA CORS ---
// Define los orígenes permitidos. Lee la variable de entorno CORS_ORIGIN.
// Si la variable existe, divide la cadena por comas. Si no, solo permite localhost:3000.
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
} ));
// --- FIN: CÓDIGO REFRACTORIZADO PARA CORS ---

app.use(fileUpload({ useTempFiles: true, tempFileDir: '/tmp/' }));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ✅ Registro CORRECTO
app.use(authRoutes(pool));
app.use(clienteRoutes(pool));
app.use(adminRoutes(pool));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
