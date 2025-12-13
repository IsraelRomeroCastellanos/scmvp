"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const cliente_routes_1 = __importDefault(require("./routes/cliente.routes"));
const db_1 = __importDefault(require("./db"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// HEALTH CHECK (antes de rutas)
app.get('/', (_req, res) => {
    res.status(200).send('OK');
});
// Ping simple sin BD
app.get('/api/ping', (_req, res) => {
    res.status(200).json({ ok: true });
});
// Ping BD (diagnóstico)
app.get('/api/ping-db', async (_req, res) => {
    try {
        const r = await db_1.default.query('SELECT 1 as ok');
        res.status(200).json({ ok: true, db: r.rows[0] });
    }
    catch (e) {
        console.error('❌ ping-db failed:', e?.message || e);
        res.status(500).json({ ok: false, error: e?.message || 'db error' });
    }
});
app.use('/', auth_routes_1.default);
app.use('/', admin_routes_1.default);
app.use('/', cliente_routes_1.default);
exports.default = app;
