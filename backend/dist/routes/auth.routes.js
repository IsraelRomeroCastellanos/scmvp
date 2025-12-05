"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/auth.routes.ts
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_jwt_muy_seguro';
// Función para sanear entradas
const sanitizeInput = (input) => {
    return input.trim().toLowerCase();
};
exports.default = (pool) => {
    // Endpoint de login
    router.post('/api/login', async (req, res) => {
        try {
            const { email, password } = req.body;
            // Validación de entradas
            if (!email || !password) {
                return res.status(400).json({
                    error: 'Email y contraseña son requeridos'
                });
            }
            console.log('Login recibido:', { email, password: '******' });
            // Sanear email
            const sanitizedEmail = sanitizeInput(email);
            // Buscar usuario
            const result = await pool.query('SELECT id, email, password_hash, nombre_completo, rol, empresa_id, activo FROM usuarios WHERE email = $1', [sanitizedEmail]);
            if (result.rows.length === 0) {
                console.log('Usuario no encontrado para el email:', sanitizedEmail);
                return res.status(401).json({
                    error: 'Credenciales inválidas'
                });
            }
            const user = result.rows[0];
            // Verificar si el usuario está activo
            if (!user.activo) {
                console.log('Usuario inactivo:', sanitizedEmail);
                return res.status(403).json({
                    error: 'Usuario desactivado. Contacta al administrador.'
                });
            }
            // Verificar contraseña
            const passwordMatch = await bcrypt_1.default.compare(password, user.password_hash);
            if (!passwordMatch) {
                console.log('Contraseña incorrecta para el usuario:', sanitizedEmail);
                return res.status(401).json({
                    error: 'Credenciales inválidas'
                });
            }
            // Generar token JWT
            const token = jsonwebtoken_1.default.sign({
                id: user.id,
                email: user.email,
                rol: user.rol,
                empresaId: user.empresa_id
            }, JWT_SECRET, { expiresIn: '24h' });
            console.log('Login exitoso para:', sanitizedEmail);
            // Responder con token y datos del usuario (sin la contraseña)
            res.status(200).json({
                token,
                user: {
                    id: user.id,
                    nombre_completo: user.nombre_completo,
                    email: user.email,
                    rol: user.rol,
                    empresa_id: user.empresa_id,
                    activo: user.activo
                }
            });
        }
        catch (error) {
            console.error('Error en login:', error);
            res.status(500).json({
                error: 'Error interno del servidor',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });
    return router;
};
