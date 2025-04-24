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
// 重试函数
function withRetry(fn_1) {
    return __awaiter(this, arguments, void 0, function* (fn, retries = 3, delay = 1000) {
        try {
            return yield fn();
        }
        catch (error) {
            if (retries <= 0)
                throw error;
            logger_1.default.warn(`操作失败，${retries}次重试后重新尝试: ${error.message}`);
            yield new Promise(resolve => setTimeout(resolve, delay));
            return withRetry(fn, retries - 1, delay * 2); // 指数退避
        }
    });
}
const streamChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    var _d, _e, _f, _g, _h;
    try {
        logger_1.default.info('收到聊天请求: %j', { ip: req.ip, headers: req.headers['user-agent'] });
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            logger_1.default.warn('无效的消息格式: %j', req.body);
            return res.status(400).json({ error: 'Invalid messages format. Expected non-empty array.' });
        }
        logger_1.default.debug('处理聊天消息: %j', messages);
        // Set headers for SSE (Server-Sent Events)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        logger_1.default.info('开始流式响应');
        try {
            // Create a streaming completion with retry
            const stream = yield withRetry(() => openai_1.default.chat.completions.create({
                model: 'gpt-4o',
                messages: messages,
                stream: true,
            }), 2, 1000);
            try {
                // Stream the response chunks to the client
                for (var _j = true, stream_1 = __asyncValues(stream), stream_1_1; stream_1_1 = yield stream_1.next(), _a = stream_1_1.done, !_a; _j = true) {
                    _c = stream_1_1.value;
                    _j = false;
                    const chunk = _c;
                    const content = ((_e = (_d = chunk.choices[0]) === null || _d === void 0 ? void 0 : _d.delta) === null || _e === void 0 ? void 0 : _e.content) || '';
                    if (content) {
                        res.write(`data: ${JSON.stringify({ content })}\n\n`);
                        // 确保数据立即发送，但不使用不兼容的flush方法
                        (_f = res.flushHeaders) === null || _f === void 0 ? void 0 : _f.call(res); // 使用可选链，如果方法存在则调用
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_j && !_a && (_b = stream_1.return)) yield _b.call(stream_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            // End the stream
            res.write('data: [DONE]\n\n');
            res.end();
            logger_1.default.info('流式响应完成');
        }
        catch (streamError) {
            logger_1.default.error('流处理错误: %o', streamError);
            // 如果是网络错误，尝试非流式响应
            if (streamError.code === 'ECONNRESET' || streamError.type === 'system') {
                logger_1.default.info('尝试使用非流式响应作为备选方案');
                try {
                    // 非流式响应
                    const completion = yield openai_1.default.chat.completions.create({
                        model: 'gpt-4o',
                        messages: messages,
                        stream: false,
                    });
                    const content = ((_h = (_g = completion.choices[0]) === null || _g === void 0 ? void 0 : _g.message) === null || _h === void 0 ? void 0 : _h.content) || '';
                    if (content) {
                        // 模拟流式响应
                        res.write(`data: ${JSON.stringify({ content })}\n\n`);
                        res.write('data: [DONE]\n\n');
                        res.end();
                        logger_1.default.info('非流式响应完成');
                        return;
                    }
                }
                catch (nonStreamError) {
                    logger_1.default.error('非流式响应也失败: %o', nonStreamError);
                    // 继续到错误处理
                }
            }
            // 如果流已经开始，发送错误信息
            if (res.headersSent) {
                res.write(`data: ${JSON.stringify({ error: '连接错误，请重试' })}\n\n`);
                res.end();
            }
            else {
                // 否则返回错误状态
                res.status(500).json({ error: '处理请求时出错，请重试' });
            }
        }
    }
    catch (error) {
        logger_1.default.error('流式聊天错误: %o', error);
        // If headers haven't been sent yet, send error response
        if (!res.headersSent) {
            res.status(500).json({ error: 'An error occurred while processing your request' });
        }
        else {
            // If headers have been sent (streaming started), send error in the stream
            res.write(`data: ${JSON.stringify({ error: 'Stream error occurred' })}\n\n`);
            res.end();
        }
    }
});
exports.streamChat = streamChat;
