"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
// Render define PORT, en local usamos 3001
const PORT = Number(process.env.PORT) || 3001;
app_1.default.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SCMVP backend listening on port ${PORT}`);
});
