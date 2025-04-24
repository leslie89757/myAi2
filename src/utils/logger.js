"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/utils/logger.ts
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
// 确保日志目录存在
const logDir = path_1.default.join(process.cwd(), 'logs');
if (!fs_1.default.existsSync(logDir)) {
    fs_1.default.mkdirSync(logDir);
}
// 日志文件路径
const logFile = path_1.default.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
// 日志级别
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
})(LogLevel || (LogLevel = {}));
// 日志颜色（控制台输出用）
const colors = {
    [LogLevel.DEBUG]: '\x1b[36m', // 青色
    [LogLevel.INFO]: '\x1b[32m', // 绿色
    [LogLevel.WARN]: '\x1b[33m', // 黄色
    [LogLevel.ERROR]: '\x1b[31m', // 红色
    reset: '\x1b[0m'
};
/**
 * 写入日志到文件和控制台
 */
function log(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const formattedMessage = args.length ? (0, util_1.format)(message, ...args) : message;
    const logEntry = `[${timestamp}] [${level}] ${formattedMessage}`;
    // 写入文件
    fs_1.default.appendFileSync(logFile, logEntry + '\n');
    // 控制台输出（带颜色）
    console.log(`${colors[level]}[${timestamp}] [${level}]${colors.reset} ${formattedMessage}`);
}
exports.default = {
    debug: (message, ...args) => log(LogLevel.DEBUG, message, ...args),
    info: (message, ...args) => log(LogLevel.INFO, message, ...args),
    warn: (message, ...args) => log(LogLevel.WARN, message, ...args),
    error: (message, ...args) => log(LogLevel.ERROR, message, ...args),
    // 获取日志文件路径
    getLogFilePath: () => logFile
};
