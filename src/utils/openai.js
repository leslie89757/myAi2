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
exports.initializeOpenAI = void 0;
const openai_1 = __importDefault(require("openai"));
const https_1 = __importDefault(require("https"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("./logger"));
// 确保环境变量已加载
dotenv_1.default.config();
// 检查API密钥是否存在
if (!process.env.OPENAI_API_KEY) {
    logger_1.default.error('缺少OPENAI_API_KEY环境变量，请确保.env文件中包含有效的API密钥');
    throw new Error('缺少OPENAI_API_KEY环境变量');
}
// 创建一个具有更好连接参数的OpenAI客户端
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
    httpAgent: new https_1.default.Agent({
        keepAlive: true,
        timeout: 60000, // 增加超时时间到60秒
        rejectUnauthorized: true
    }),
    timeout: 60000, // 客户端整体超时
    maxRetries: 3, // OpenAI客户端内置的重试次数
});
// 导出初始化函数以便在应用启动时确认连接
const initializeOpenAI = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        logger_1.default.info('验证OpenAI API连接...');
        const response = yield openai.models.list();
        logger_1.default.info(`OpenAI API连接成功，可用${response.data.length}个模型`);
        return true;
    }
    catch (error) {
        logger_1.default.error('OpenAI API连接验证失败:', error.message);
        if (error.code === 'ECONNRESET') {
            logger_1.default.error('网络连接被重置，请检查网络连接或防火墙设置');
        }
        return false;
    }
});
exports.initializeOpenAI = initializeOpenAI;
exports.default = openai;
