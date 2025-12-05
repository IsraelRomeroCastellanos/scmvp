// backend/src/main.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import fileUpload from 'express-fileupload';
import authRoutes from './routes/auth.routes';
import { clienteRoutes } from './routes/cliente.routes';
import { adminRoutes } from './routes/admin.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

// ✅ CONFIGURACIÓN CORS DEFINITIVA - acepta TODOS los orígenes necesarios
const corsOptions = {
  origin: function (origin: any, callback: any) {
    // Permitir solicitudes sin origin (como Postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    // Lista de orígenes permitidos - ¡INCLUYE LOCALHOST!
    const allowedOrigins = [
      'http://localhost:3000',           // Desarrollo local
      'http://localhost:8080',           // Pruebas HTML locales
      'https://plataforma-cumplimiento-mvp-qj4w.vercel.app',  // Vercel producción
      'https://plataforma-cumplimiento-mvp.vercel.app',       // Otras URLs de Vercel
      'https://plataforma-cumplimiento-mvp.onrender.com'      // Render (si se usa directamente)
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ CORS bloqueado para origen: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin']
};

// ✅ MIDDLEWARE CORS - debe ir ANTES de cualquier otro middleware
app.use(cors(corsOptions));

// ✅ MANEJO DE OPTIONS (preflight requests)
app.options('*', cors(corsOptions));

// ✅ Otro middleware
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ Configuración de base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { 
    rejectUnauthorized: false 
  } : false,
});

// ✅ Rutas - orden crítico
app.use('/api/login', authRoutes(pool));
app.use('/api/cliente', clienteRoutes(pool));
app.use('/api/admin', adminRoutes(pool));

// ✅ Rutas públicas
app.get('/api/health', (req, res) => {
  res.json({ 
    status: "OK",
    timestamp: new Date().toISOString(),
    node_env: process.env.NODE_ENV,
    database_connected: !!pool
  });
});

// ✅ MANEJADOR DE ERRORES GLOBAL - ¡SIEMPRE RESPONDER JSON!
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error global:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
  
  // ✅ Determinar tipo de error para respuesta apropiada
  let status = 500;
  let message = 'Error interno del servidor';
  
  if (err.status) status = err.status;
  if (err.message) message = err.message;
  
  // ✅ SIEMPRE RESPONDER JSON, INCLUSO EN ERRORES
  res.status(status).json({ 
    error: message,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
});

// ✅ MANEJADOR 404 - ¡SIEMPRE RESPONDER JSON!
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`✅ Backend corriendo en puerto ${port}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Orígenes permitidos por CORS: ${corsOptions.origin}`);
});

export default app;