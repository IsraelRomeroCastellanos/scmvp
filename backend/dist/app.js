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
const app = (0, express_1.default)();
// ===============================
// MIDDLEWARES BÁSICOS
// ===============================
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ===============================
// HEALTH CHECK (ANTES DE RUTAS)
// ===============================
app.get('/', (_req, res) => {
    res.status(200).send('OK');
});
// ===============================
// RUTAS DE LA APLICACIÓN
// ===============================
app.use('/', auth_routes_1.default);
app.use('/', admin_routes_1.default);
app.use('/', cliente_routes_1.default);
exports.default = app;
