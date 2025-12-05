"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clienteRoutes = void 0;
const express_1 = require("express");
const router = (0, express_1.Router)();
const clienteRoutes = (pool) => {
    router.get('/api/cliente/mis-clientes', async (req, res) => {
        try {
            const result = await pool.query('SELECT id, nombre_entidad, tipo_cliente, actividad_economica, estado FROM clientes');
            res.json({ clientes: result.rows });
        }
        catch (err) {
            console.error('Error al listar clientes:', err);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    });
    return router;
};
exports.clienteRoutes = clienteRoutes;
