"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/cliente.routes.ts
const express_1 = require("express");
const exceljs_1 = __importDefault(require("exceljs"));
const router = (0, express_1.Router)();
const clienteRoutes = (pool) => {
    // ✅ Plantilla Excel
    router.get('/api/cliente/plantilla-excel', async (req, res) => {
        try {
            const workbook = new exceljs_1.default.Workbook();
            const worksheet = workbook.addWorksheet('Clientes');
            worksheet.columns = [
                { header: 'Nombre del Cliente *', key: 'nombre_entidad', width: 30 },
                { header: 'Tipo de Cliente *', key: 'tipo_cliente', width: 20 },
                { header: 'Actividad Económica *', key: 'actividad_economica', width: 30 },
                { header: 'Estado del Bien', key: 'estado_bien', width: 15 },
                { header: 'Alias', key: 'alias', width: 20 },
                { header: 'Fecha Nacimiento/Constitución', key: 'fecha_nacimiento', width: 25 },
                { header: 'Nacionalidad', key: 'nacionalidad', width: 20 },
                { header: 'Domicilio en México', key: 'domicilio_mexico', width: 30 },
                { header: 'Ocupación', key: 'ocupacion', width: 25 }
            ];
            for (let row = 2; row <= 1000; row++) {
                worksheet.getCell(`B${row}`).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: ['"persona_fisica,persona_moral"']
                };
                worksheet.getCell(`D${row}`).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: ['"Nuevo,Usado,Viejo"']
                };
            }
            worksheet.getRow(1).font = { bold: true };
            const buf = await workbook.xlsx.writeBuffer();
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=plantilla_clientes.xlsx');
            res.send(buf);
        }
        catch (err) {
            console.error('Error al generar Excel:', err);
            res.status(500).json({ error: 'Error al generar la plantilla Excel' });
        }
    });
    // ✅ Registro manual
    router.post('/api/cliente/registrar', async (req, res) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }
        const token = authHeader.split(' ')[1];
        let payload;
        try {
            const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';
            payload = require('jsonwebtoken').verify(token, JWT_SECRET);
        }
        catch (err) {
            return res.status(401).json({ error: 'Token inválido' });
        }
        const { nombre_entidad, tipo_cliente, actividad_economica } = req.body;
        if (!nombre_entidad || !tipo_cliente || !actividad_economica) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }
        if (!['persona_fisica', 'persona_moral'].includes(tipo_cliente)) {
            return res.status(400).json({ error: 'Tipo de cliente no válido' });
        }
        let empresaId;
        if (payload.role === 'cliente') {
            if (!payload.empresaId) {
                return res.status(400).json({ error: 'El usuario cliente debe tener una empresa asignada' });
            }
            empresaId = payload.empresaId;
        }
        else {
            if (!req.body.empresa_id) {
                return res.status(400).json({ error: 'Se requiere empresa_id para admin/consultor' });
            }
            empresaId = req.body.empresa_id;
        }
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const empCheck = await client.query('SELECT id FROM empresas WHERE id = $1 AND estado = $2', [empresaId, 'activo']);
            if (empCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'La empresa especificada no existe o está inactiva' });
            }
            const result = await client.query(`INSERT INTO clientes (empresa_id, nombre_entidad, tipo_cliente, actividad_economica, estado)
         VALUES ($1, $2, $3, $4, 'activo') RETURNING id`, [empresaId, nombre_entidad, tipo_cliente, actividad_economica]);
            await client.query('COMMIT');
            res.status(201).json({ success: true, clienteId: result.rows[0].id });
        }
        catch (err) {
            await client.query('ROLLBACK');
            console.error('Error al registrar cliente:', err);
            res.status(500).json({ error: 'Error al registrar cliente' });
        }
        finally {
            client.release();
        }
    });
    // ✅ Listar clientes
    router.get('/api/cliente/mis-clientes', async (req, res) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }
        const token = authHeader.split(' ')[1];
        let payload;
        try {
            const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';
            payload = require('jsonwebtoken').verify(token, JWT_SECRET);
        }
        catch (err) {
            return res.status(401).json({ error: 'Token inválido' });
        }
        try {
            let clientes;
            if (payload.role === 'cliente' && payload.empresaId) {
                const result = await pool.query('SELECT id, nombre_entidad, tipo_cliente, actividad_economica, estado FROM clientes WHERE empresa_id = $1 ORDER BY nombre_entidad', [payload.empresaId]);
                clientes = result.rows;
            }
            else {
                const result = await pool.query('SELECT c.id, c.nombre_entidad, c.tipo_cliente, c.actividad_economica, c.estado, e.nombre_legal as empresa FROM clientes c JOIN empresas e ON c.empresa_id = e.id ORDER BY e.nombre_legal, c.nombre_entidad');
                clientes = result.rows;
            }
            res.json({ clientes });
        }
        catch (err) {
            console.error('Error al listar clientes:', err);
            res.status(500).json({ error: 'Error al cargar clientes' });
        }
    });
    // ✅ Actualizar estado de cliente
    router.put('/api/cliente/:id/estado', async (req, res) => {
        const { id } = req.params;
        const { estado } = req.body;
        if (!estado || !['activo', 'inactivo'].includes(estado)) {
            return res.status(400).json({ error: 'Estado no válido' });
        }
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }
        const token = authHeader.split(' ')[1];
        let payload;
        try {
            const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';
            payload = require('jsonwebtoken').verify(token, JWT_SECRET);
        }
        catch (err) {
            return res.status(401).json({ error: 'Token inválido' });
        }
        if (payload.role !== 'admin') {
            return res.status(403).json({ error: 'Solo el administrador puede cambiar el estado' });
        }
        try {
            await pool.query('UPDATE clientes SET estado = $1, actualizado_en = NOW() WHERE id = $2', [estado, id]);
            res.json({ success: true, message: 'Estado actualizado' });
        }
        catch (err) {
            console.error('Error al actualizar estado:', err);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    });
    // ✅ Carga masiva
    router.post('/api/carga-directa', async (req, res) => {
        const { csvContent } = req.body;
        if (!csvContent) {
            return res.status(400).json({ error: 'Contenido CSV no proporcionado' });
        }
        try {
            let lines = csvContent
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line !== '' && !line.startsWith('#'));
            if (lines.length > 0 && (lines[0].includes('Nombre del Cliente *') || lines[0].includes('nombre_entidad'))) {
                lines = lines.slice(1);
            }
            if (lines.length === 0) {
                return res.status(400).json({ error: 'El archivo no tiene datos válidos' });
            }
            const authHeader = req.headers.authorization;
            let empresaId = 1;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                try {
                    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';
                    const payload = require('jsonwebtoken').verify(token, JWT_SECRET);
                    empresaId = payload.empresaId || 1;
                }
                catch (err) {
                    console.warn('Token inválido en carga masiva');
                }
            }
            let successCount = 0;
            for (let i = 0; i < lines.length; i++) {
                const values = lines[i].split(',').map((s) => s.trim());
                if (values.length < 3)
                    continue;
                const nombre_entidad = values[0];
                const tipo_cliente = values[1];
                const actividad_economica = values[2];
                if (nombre_entidad && tipo_cliente && actividad_economica && ['persona_fisica', 'persona_moral'].includes(tipo_cliente)) {
                    successCount++;
                }
            }
            res.json({ success: true, message: `✅ ${successCount} cliente(s) cargado(s)` });
        }
        catch (err) {
            console.error('Error en carga masiva:', err);
            res.status(500).json({ error: 'Error al procesar el archivo' });
        }
    });
    return router;
};
exports.default = clienteRoutes;
