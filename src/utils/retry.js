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
exports.withRetry = withRetry;
const logger_1 = __importDefault(require("./logger"));
// 改进的重试函数，带有指数退避策略
function withRetry(fn_1) {
    return __awaiter(this, arguments, void 0, function* (fn, options = {
        retries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'ENOTFOUND', 'EAI_AGAIN']
    }) {
        let lastError;
        for (let attempt = 0; attempt <= options.retries; attempt++) {
            try {
                if (attempt > 0) {
                    // 计算当前重试的延迟时间（指数退避）
                    const delay = Math.min(options.baseDelay * Math.pow(2, attempt - 1), options.maxDelay);
                    // 添加随机抖动以避免重试风暴
                    const jitter = Math.random() * 0.3 * delay;
                    const waitTime = delay + jitter;
                    logger_1.default.warn(`第${attempt}次重试，等待${Math.round(waitTime)}ms后重试`);
                    yield new Promise(resolve => setTimeout(resolve, waitTime));
                }
                return yield fn();
            }
            catch (error) {
                lastError = error;
                // 检查是否为可重试的错误
                const isNetworkError = error.code && options.retryableErrors.includes(error.code);
                const isRateLimitError = error.status === 429;
                if (attempt < options.retries && (isNetworkError || isRateLimitError)) {
                    logger_1.default.warn(`请求失败 (${error.code || error.status || '未知错误'})，准备重试: ${error.message}`);
                }
                else {
                    // 如果已经达到最大重试次数或不是可重试的错误，则抛出
                    logger_1.default.error(`请求失败，不再重试: ${error.message}`);
                    throw error;
                }
            }
        }
        // 这行代码理论上不会执行，但TypeScript需要它
        throw lastError;
    });
}
