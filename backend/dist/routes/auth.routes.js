"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/auth.routes.ts
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';
const authRoutes = (pool) => {
    router.post('/api/login', async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }
        try {
            const result = await pool.query('SELECT id, email, password_hash, rol, empresa_id FROM usuarios WHERE email = $1', [email]);
            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }
            const user = result.rows[0];
            const isValid = await bcrypt_1.default.compare(password, user.password_hash);
            if (!isValid) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }
            const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.rol, empresaId: user.empresa_id }, JWT_SECRET, { expiresIn: '24h' });
            res.json({
                success: true,
                token,
                user: { id: user.id, email: user.email, role: user.rol, empresaId: user.empresa_id }
            });
        }
        catch (err) {
            console.error('Error en login:', err);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    });
    return router;
};
exports.default = authRoutes;
