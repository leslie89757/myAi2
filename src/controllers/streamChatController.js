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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamChat = void 0;
const openai_1 = __importDefault(require("../utils/openai"));
const logger_1 = __importDefault(require("../utils/logger"));
const retry_1 = require("../utils/retry");
/**
 * @swagger
 * /api/stream-chat:
 *   post:
 *     summary: 流式聊天接口
 *     description: 使用Server-Sent Events (SSE)格式返回ChatGPT的流式响应
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
 *         description: 成功，开始流式响应
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               example: "data: {\"content\":\"你好！\"}\n\ndata: {\"content\":\"我是一个AI助手\"}\n\ndata: [DONE]"
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
const streamChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    var _d, _e, _f;
    try {
        logger_1.default.info('收到流式聊天请求');
        const { message } = req.body;
        if (!message || typeof message !== 'string') {
            logger_1.default.warn('无效的消息格式');
            return res.status(400).json({ error: '请提供有效的消息' });
        }
        logger_1.default.info(`处理用户消息: ${message}`);
        // 设置SSE头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        try {
            // 创建流式聊天完成
            logger_1.default.info('开始流式响应');
            const stream = yield (0, retry_1.withRetry)(() => openai_1.default.chat.completions.create({
                model: 'gpt-4o',
                messages: [{ role: 'user', content: message }],
                stream: true
            }));
            try {
                // 处理流式响应
                for (var _g = true, stream_1 = __asyncValues(stream), stream_1_1; stream_1_1 = yield stream_1.next(), _a = stream_1_1.done, !_a; _g = true) {
                    _c = stream_1_1.value;
                    _g = false;
                    const chunk = _c;
                    const content = ((_e = (_d = chunk.choices[0]) === null || _d === void 0 ? void 0 : _d.delta) === null || _e === void 0 ? void 0 : _e.content) || '';
                    if (content) {
                        // 发送SSE格式的数据
                        res.write(`data: ${JSON.stringify({ content })}\n\n`);
                        // 确保数据立即发送
                        (_f = res.flushHeaders) === null || _f === void 0 ? void 0 : _f.call(res);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_g && !_a && (_b = stream_1.return)) yield _b.call(stream_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            // 结束流
            res.write('data: [DONE]\n\n');
            res.end();
            logger_1.default.info('流式响应完成');
        }
        catch (apiError) {
            logger_1.default.error(`流式API调用错误 [${apiError.code || apiError.status || '未知'}]: ${apiError.message}`);
            // 如果已经发送了头信息，则通过SSE发送错误
            if (res.headersSent) {
                res.write(`data: ${JSON.stringify({ error: '处理请求时出错，请重试' })}\n\n`);
                res.end();
            }
            else {
                // 否则返回常规错误响应
                return res.status(500).json({
                    success: false,
                    error: '调用ChatGPT API时出错',
                    details: apiError.message
                });
            }
        }
    }
    catch (error) {
        logger_1.default.error('处理流式请求时出错:', error);
        // 如果已经发送了头信息，则通过SSE发送错误
        if (res.headersSent) {
            res.write(`data: ${JSON.stringify({ error: '服务器内部错误' })}\n\n`);
            res.end();
        }
        else {
            // 否则返回常规错误响应
            return res.status(500).json({
                success: false,
                error: '服务器内部错误',
                details: error.message
            });
        }
    }
});
exports.streamChat = streamChat;
