"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/main.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const pg_1 = require("pg");
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const cliente_routes_1 = require("./routes/cliente.routes");
const admin_routes_1 = require("./routes/admin.routes");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 10000;
// ✅ CONFIGURACIÓN CORS DEFINITIVA - acepta TODOS los orígenes necesarios
const corsOptions = {
    origin: function (origin, callback) {
        // Permitir solicitudes sin origin (como Postman, curl, server-to-server)
        if (!origin)
            return callback(null, true);
        // Lista de orígenes permitidos - ¡INCLUYE LOCALHOST!
        const allowedOrigins = [
            'http://localhost:3000', // Desarrollo local
            'http://localhost:8080', // Pruebas HTML locales
            'https://plataforma-cumplimiento-mvp-qj4w.vercel.app', // Vercel producción
            'https://plataforma-cumplimiento-mvp.vercel.app', // Otras URLs de Vercel
            'https://plataforma-cumplimiento-mvp.onrender.com' // Render (si se usa directamente)
        ];
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.log(`❌ CORS bloqueado para origen: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin']
};
// ✅ MIDDLEWARE CORS - debe ir ANTES de cualquier otro middleware
app.use((0, cors_1.default)(corsOptions));
// ✅ MANEJO DE OPTIONS (preflight requests)
app.options('*', (0, cors_1.default)(corsOptions));
// ✅ Otro middleware
app.use((0, express_fileupload_1.default)({
    useTempFiles: true,
    tempFileDir: '/tmp/',
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// ✅ Configuración de base de datos
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false,
});
// ✅ Rutas - orden crítico
app.use('/api/login', (0, auth_routes_1.default)(pool));
app.use('/api/cliente', (0, cliente_routes_1.clienteRoutes)(pool));
app.use('/api/admin', (0, admin_routes_1.adminRoutes)(pool));
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
app.use((err, req, res, next) => {
    console.error('Error global:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    // ✅ Determinar tipo de error para respuesta apropiada
    let status = 500;
    let message = 'Error interno del servidor';
    if (err.status)
        status = err.status;
    if (err.message)
        message = err.message;
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
exports.default = app;
