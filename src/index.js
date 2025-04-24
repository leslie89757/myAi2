"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("./utils/logger"));
const openai_1 = require("./utils/openai");
const simpleChatController_1 = require("./controllers/simpleChatController");
const streamChatController_1 = require("./controllers/streamChatController");
const swagger_1 = require("./utils/swagger");
// 加载环境变量
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// 中间件
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false // 禁用CSP以允许内联脚本
}));
app.use(express_1.default.json());
// 静态文件服务
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
// 请求日志中间件
app.use((req, res, next) => {
    logger_1.default.info(`${req.method} ${req.url}`);
    next();
});
// 设置Swagger文档
(0, swagger_1.setupSwagger)(app);
// API路由
app.post('/api/simple-chat', simpleChatController_1.simpleChat);
app.post('/api/stream-chat', streamChatController_1.streamChat);
// 页面路由
app.get('/stream-test', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, 'public', 'stream-test.html'));
});
// 健康检查端点
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
// 默认路由
app.get('/', (req, res) => {
    res.redirect('/stream-test');
});
// 错误处理中间件
app.use((err, req, res, next) => {
    logger_1.default.error(`服务器错误: ${err.message}`);
    res.status(500).json({ error: '服务器内部错误' });
});
// 启动服务器
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 初始化OpenAI客户端并验证连接
        yield (0, openai_1.initializeOpenAI)();
        app.listen(PORT, () => {
            logger_1.default.info(`服务器启动在 http://localhost:${PORT}`);
            logger_1.default.info(`API文档可在 http://localhost:${PORT}/api-docs 访问`);
        });
    }
    catch (error) {
        logger_1.default.error('服务器启动失败:', error.message);
        process.exit(1);
    }
});
startServer();
