"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/admin.routes.ts
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const router = (0, express_1.Router)();
const saltRounds = 10;
const adminRoutes = (pool) => {
    // ✅ Listar usuarios
    router.get('/api/admin/usuarios', async (req, res) => {
        try {
            const result = await pool.query('SELECT id, email, nombre_completo, rol, empresa_id, activo FROM usuarios ORDER BY creado_en DESC');
            res.json({ usuarios: result.rows });
        }
        catch (err) {
            console.error('Error al listar usuarios:', err);
            res.status(500).json({ error: 'Error al cargar usuarios' });
        }
    });
    // ✅ Obtener un usuario
    router.get('/api/admin/usuarios/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query('SELECT id, email, nombre_completo, rol, empresa_id, activo FROM usuarios WHERE id = $1', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            res.json(result.rows[0]);
        }
        catch (err) {
            console.error('Error al obtener usuario:', err);
            res.status(500).json({ error: 'Error al cargar usuario' });
        }
    });
    // ✅ Editar usuario
    router.put('/api/admin/usuarios/:id', async (req, res) => {
        const { id } = req.params;
        const { email, nombre_completo, rol, empresa_id, activo } = req.body;
        try {
            const userCheck = await pool.query('SELECT id, email FROM usuarios WHERE id = $1', [id]);
            if (userCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            const usuarioActual = userCheck.rows[0];
            if (usuarioActual.email === 'admin@cumplimiento.com') {
                if (rol !== undefined && rol !== 'admin') {
                    return res.status(403).json({ error: 'El rol del usuario raíz no puede modificarse' });
                }
                if (email !== undefined && email !== 'admin@cumplimiento.com') {
                    return res.status(403).json({ error: 'El email del usuario raíz no puede modificarse' });
                }
            }
            const fields = [];
            const values = [];
            let paramIndex = 1;
            if (email !== undefined)
                fields.push(`email = $${paramIndex++}`);
            if (nombre_completo !== undefined)
                fields.push(`nombre_completo = $${paramIndex++}`);
            if (rol !== undefined)
                fields.push(`rol = $${paramIndex++}`);
            if (empresa_id !== undefined)
                fields.push(`empresa_id = $${paramIndex++}`);
            if (activo !== undefined)
                fields.push(`activo = $${paramIndex++}`);
            if (fields.length === 0) {
                return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
            }
            values.push(...[email, nombre_completo, rol, empresa_id, activo].filter(v => v !== undefined), id);
            const query = `
        UPDATE usuarios 
        SET ${fields.join(', ')}, actualizado_en = NOW() 
        WHERE id = $${paramIndex}
      `;
            await pool.query(query, values);
            res.json({ success: true, message: 'Usuario actualizado' });
        }
        catch (err) {
            console.error('Error al actualizar usuario:', err);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    });
    // ✅ Restablecer contraseña
    router.post('/api/admin/usuarios/:id/reset-password', async (req, res) => {
        const { id } = req.params;
        try {
            const rootCheck = await pool.query('SELECT email FROM usuarios WHERE id = $1 AND email = $2', [id, 'admin@cumplimiento.com']);
            if (rootCheck.rows.length > 0) {
                return res.status(403).json({ error: 'No se puede restablecer la contraseña del usuario raíz' });
            }
            const temporalPassword = 'Temp' + Math.random().toString(36).slice(2, 8) + '!';
            const passwordHash = await bcrypt_1.default.hash(temporalPassword, saltRounds);
            await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2 RETURNING email', [passwordHash, id]);
            res.json({
                success: true,
                email: 'usuario@ejemplo.com',
                temporalPassword
            });
        }
        catch (err) {
            console.error('Error al restablecer contraseña:', err);
            res.status(500).json({ error: 'Error al restablecer contraseña' });
        }
    });
    // ✅ Listar empresas
    router.get('/api/admin/empresas', async (req, res) => {
        try {
            const result = await pool.query('SELECT id, nombre_legal, rfc, tipo_entidad, estado FROM empresas ORDER BY nombre_legal');
            res.json({ empresas: result.rows });
        }
        catch (err) {
            console.error('Error al listar empresas:', err);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    });
    // ✅ Editar empresa
    router.put('/api/admin/empresas/:id', async (req, res) => {
        const { id } = req.params;
        const { nombre_legal, rfc, tipo_entidad, estado } = req.body;
        if (!nombre_legal || !tipo_entidad) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }
        if (!['persona_fisica', 'persona_moral'].includes(tipo_entidad)) {
            return res.status(400).json({ error: 'Tipo de entidad no válido' });
        }
        if (estado && !['activo', 'suspendido', 'inactivo'].includes(estado)) {
            return res.status(400).json({ error: 'Estado no válido' });
        }
        try {
            const check = await pool.query('SELECT id FROM empresas WHERE id = $1', [id]);
            if (check.rows.length === 0) {
                return res.status(404).json({ error: 'Empresa no encontrada' });
            }
            await pool.query('UPDATE empresas SET nombre_legal = $1, rfc = $2, tipo_entidad = $3, estado = $4, actualizado_en = NOW() WHERE id = $5', [nombre_legal, rfc || null, tipo_entidad, estado || 'activo', id]);
            res.json({ success: true, message: 'Empresa actualizada' });
        }
        catch (err) {
            console.error('Error al editar empresa:', err);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    });
    return router;
};
exports.default = adminRoutes;
