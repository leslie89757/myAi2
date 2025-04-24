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
exports.simpleChat = void 0;
const openai_1 = __importDefault(require("../utils/openai"));
const logger_1 = __importDefault(require("../utils/logger"));
const retry_1 = require("../utils/retry");
/**
 * @swagger
 * /api/simple-chat:
 *   post:
 *     summary: 简单聊天接口
 *     description: 返回ChatGPT的非流式响应
 *     tags:
 *       - 聊天
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: 用户发送的消息内容
 *                 example: "你好，请介绍一下自己"
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 reply:
 *                   type: string
 *                   example: "你好！我是一个AI助手，可以回答问题、提供信息和帮助完成各种任务。"
 *                 model:
 *                   type: string
 *                   example: "gpt-4o"
 *                 usage:
 *                   type: object
 *                   properties:
 *                     prompt_tokens:
 *                       type: integer
 *                       example: 10
 *                     completion_tokens:
 *                       type: integer
 *                       example: 30
 *                     total_tokens:
 *                       type: integer
 *                       example: 40
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "请提供有效的消息"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "服务器内部错误"
 *                 details:
 *                   type: string
 *                   example: "错误详情"
 */
const simpleChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        logger_1.default.info('收到简单聊天请求');
        const { message } = req.body;
        if (!message || typeof message !== 'string') {
            logger_1.default.warn('无效的消息格式');
            return res.status(400).json({ error: '请提供有效的消息' });
        }
        logger_1.default.info(`处理用户消息: ${message}`);
        try {
            // 创建一个简单的非流式聊天完成，使用改进的重试机制
            const completion = yield (0, retry_1.withRetry)(() => openai_1.default.chat.completions.create({
                model: 'gpt-4o',
                messages: [{ role: 'user', content: message }],
                stream: false
            }));
            // 确保我们获取到的是非流式响应
            const reply = ((_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '无回复';
            logger_1.default.info('收到ChatGPT回复');
            return res.status(200).json({
                success: true,
                reply,
                model: completion.model,
                usage: completion.usage
            });
        }
        catch (apiError) {
            // 更详细的错误信息记录
            logger_1.default.error(`API调用错误 [${apiError.code || apiError.status || '未知'}]: ${apiError.message}`);
            if (apiError.code === 'ECONNRESET') {
                return res.status(503).json({
                    success: false,
                    error: '与OpenAI API的连接被重置，请稍后再试',
                    details: '可能是网络问题或API服务暂时不可用'
                });
            }
            return res.status(500).json({
                success: false,
                error: '调用ChatGPT API时出错',
                details: apiError.message
            });
        }
    }
    catch (error) {
        logger_1.default.error('处理请求时出错:', error);
        return res.status(500).json({
            success: false,
            error: '服务器内部错误',
            details: error.message
        });
    }
});
exports.simpleChat = simpleChat;
