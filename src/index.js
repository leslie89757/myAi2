"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// 示例路由
app.get('/', (req, res) => {
    res.json({ message: 'Hello from TypeScript API!' });
});
app.get('/users', (req, res) => {
    res.json([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]);
});
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
