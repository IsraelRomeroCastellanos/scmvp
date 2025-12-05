"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = exports.JWT_SECRET = void 0;
// backend/src/services/auth.service.ts
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
exports.JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';
const generateToken = (userId, email, role, empresaId) => {
    return jsonwebtoken_1.default.sign({ userId, email, role, empresaId }, exports.JWT_SECRET, { expiresIn: '24h' });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, exports.JWT_SECRET);
    }
    catch (err) {
        return null;
    }
};
exports.verifyToken = verifyToken;
// ✅ NO incluir: export { JWT_SECRET };
