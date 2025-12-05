"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            if (!allowedRoles.includes(decoded.role)) {
                return res.status(403).json({ error: 'Acceso denegado: rol insuficiente' });
            }
            req.user = decoded;
            next();
        }
        catch (err) {
            return res.status(401).json({ error: 'Token inválido o expirado' });
        }
    };
};
exports.authorizeRoles = authorizeRoles;
