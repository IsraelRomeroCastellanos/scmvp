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
// Importaciones de Rutas (Ahora usan importación por defecto)
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const cliente_routes_1 = __importDefault(require("./routes/cliente.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 10000;
// --- INICIO: CÓDIGO REFRACTORIZADO PARA CORS ---
// Define los orígenes permitidos. Lee la variable de entorno CORS_ORIGIN.
// Si la variable existe, divide la cadena por comas. Si no, solo permite localhost:3000.
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'];
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true
}));
// --- FIN: CÓDIGO REFRACTORIZADO PARA CORS ---
app.use((0, express_fileupload_1.default)({ useTempFiles: true, tempFileDir: '/tmp/' }));
app.use(express_1.default.json());
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
// ✅ Registro CORRECTO
app.use((0, auth_routes_1.default)(pool));
app.use((0, cliente_routes_1.default)(pool));
app.use((0, admin_routes_1.default)(pool));
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
});
app.listen(port, () => {
    console.log(`Backend running on port ${port}`);
});
