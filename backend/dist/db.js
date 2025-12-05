"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
// backend/src/db.ts
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
// Verificar conexión
exports.pool.on('connect', () => {
    console.log('✅ Conexión a base de datos establecida');
});
exports.pool.on('error', (err) => {
    console.error('❌ Error en conexión de base de datos:', err);
    process.exit(-1);
});
exports.default = exports.pool;
