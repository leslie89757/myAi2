"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwagger = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
// Swagger定义
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'ChatGPT API',
            version: '1.0.0',
            description: 'ChatGPT API文档，包含流式和非流式接口',
            contact: {
                name: '开发团队'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: '开发服务器'
            }
        ]
    },
    // 指定包含API注释的文件路径
    apis: ['./src/controllers/*.ts', './src/routes/*.ts', './src/models/*.ts']
};
// 初始化swagger-jsdoc
const specs = (0, swagger_jsdoc_1.default)(options);
// 设置Swagger UI
const setupSwagger = (app) => {
    app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(specs));
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(specs);
    });
};
exports.setupSwagger = setupSwagger;
