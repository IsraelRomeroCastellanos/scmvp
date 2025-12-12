"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/admin.routes.ts
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
/* ======================================================
   EMPRESAS
   ====================================================== */
/**
 * LISTAR EMPRESAS
 * GET /api/admin/empresas
 */
router.get('/api/admin/empresas', async (req, res) => {
    try {
        const result = await db_1.default.query(`
      SELECT
        id,
        nombre_legal,
        rfc,
        tipo_entidad,
        pais,
        domicilio,
        actividad,
        codigo_postal,
        entidad,
        municipio,
        estado,
        creado_en
      FROM empresas
      ORDER BY nombre_legal
    `);
        res.json({ empresas: result.rows });
    }
    catch (error) {
        console.error('Error al listar empresas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
/**
 * CREAR EMPRESA
 * POST /api/admin/empresas
 */
router.post('/api/admin/empresas', async (req, res) => {
    try {
        const { nombre_legal, rfc, tipo_entidad, pais, domicilio, actividad, codigo_postal, entidad, municipio } = req.body;
        const faltantes = [];
        if (!nombre_legal)
            faltantes.push('nombre_legal');
        if (!rfc)
            faltantes.push('rfc');
        if (!tipo_entidad)
            faltantes.push('tipo_entidad');
        if (!pais)
            faltantes.push('pais');
        if (!domicilio)
            faltantes.push('domicilio');
        if (!actividad)
            faltantes.push('actividad');
        if (!codigo_postal)
            faltantes.push('codigo_postal');
        if (!entidad)
            faltantes.push('entidad');
        if (!municipio)
            faltantes.push('municipio');
        if (faltantes.length > 0) {
            return res.status(400).json({
                error: `Faltan campos obligatorios: ${faltantes.join(', ')}`
            });
        }
        const result = await db_1.default.query(`
      INSERT INTO empresas (
        nombre_legal,
        rfc,
        tipo_entidad,
        pais,
        domicilio,
        actividad,
        codigo_postal,
        entidad,
        municipio,
        estado
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'activo')
      RETURNING *
      `, [
            nombre_legal,
            rfc,
            tipo_entidad,
            pais,
            domicilio,
            actividad,
            codigo_postal,
            entidad,
            municipio
        ]);
        res.status(201).json({ empresa: result.rows[0] });
    }
    catch (error) {
        console.error('Error al crear empresa:', error);
        if (error.code === '23505') {
            return res.status(409).json({
                error: 'Ya existe una empresa con el mismo nombre legal o RFC'
            });
        }
        res.status(500).json({ error: 'Error interno al crear la empresa' });
    }
});
/**
 * EDITAR EMPRESA
 * PUT /api/admin/empresas/:id
 */
router.put('/api/admin/empresas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { nombre_legal, rfc, tipo_entidad, pais, domicilio, actividad, codigo_postal, entidad, municipio, estado } = req.body;
        const faltantes = [];
        if (!nombre_legal)
            faltantes.push('nombre_legal');
        if (!rfc)
            faltantes.push('rfc');
        if (!tipo_entidad)
            faltantes.push('tipo_entidad');
        if (!pais)
            faltantes.push('pais');
        if (!domicilio)
            faltantes.push('domicilio');
        if (!actividad)
            faltantes.push('actividad');
        if (!codigo_postal)
            faltantes.push('codigo_postal');
        if (!entidad)
            faltantes.push('entidad');
        if (!municipio)
            faltantes.push('municipio');
        if (!estado)
            faltantes.push('estado');
        if (faltantes.length > 0) {
            return res.status(400).json({
                error: `Faltan campos obligatorios: ${faltantes.join(', ')}`
            });
        }
        const result = await db_1.default.query(`
      UPDATE empresas
      SET
        nombre_legal = $1,
        rfc = $2,
        tipo_entidad = $3,
        pais = $4,
        domicilio = $5,
        actividad = $6,
        codigo_postal = $7,
        entidad = $8,
        municipio = $9,
        estado = $10,
        actualizado_en = NOW()
      WHERE id = $11
      RETURNING *
      `, [
            nombre_legal,
            rfc,
            tipo_entidad,
            pais,
            domicilio,
            actividad,
            codigo_postal,
            entidad,
            municipio,
            estado,
            id
        ]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Empresa no encontrada' });
        }
        res.json({ empresa: result.rows[0] });
    }
    catch (error) {
        console.error('Error al editar empresa:', error);
        res.status(500).json({ error: 'Error interno al editar la empresa' });
    }
});
exports.default = router;
