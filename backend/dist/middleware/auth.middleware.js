"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const auth_service_1 = require("../services/auth.service");
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }
    const token = authHeader.split(' ')[1];
    const payload = (0, auth_service_1.verifyToken)(token);
    if (!payload) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
    // Adjunta el usuario al request
    req.user = payload;
    next();
};
exports.authenticate = authenticate;
