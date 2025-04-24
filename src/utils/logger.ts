// src/utils/logger.ts
import fs from 'fs';
import path from 'path';
import { format } from 'util';

// 确保日志目录存在
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// 日志文件路径
const logFile = path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);

// 日志级别
enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

// 日志颜色（控制台输出用）
const colors = {
  [LogLevel.DEBUG]: '\x1b[36m', // 青色
  [LogLevel.INFO]: '\x1b[32m',  // 绿色
  [LogLevel.WARN]: '\x1b[33m',  // 黄色
  [LogLevel.ERROR]: '\x1b[31m', // 红色
  reset: '\x1b[0m'
};

/**
 * 写入日志到文件和控制台
 */
function log(level: LogLevel, message: string, ...args: any[]) {
  const timestamp = new Date().toISOString();
  const formattedMessage = args.length ? format(message, ...args) : message;
  const logEntry = `[${timestamp}] [${level}] ${formattedMessage}`;
  
  // 写入文件
  fs.appendFileSync(logFile, logEntry + '\n');
  
  // 控制台输出（带颜色）
  console.log(`${colors[level]}[${timestamp}] [${level}]${colors.reset} ${formattedMessage}`);
}

export default {
  debug: (message: string, ...args: any[]) => log(LogLevel.DEBUG, message, ...args),
  info: (message: string, ...args: any[]) => log(LogLevel.INFO, message, ...args),
  warn: (message: string, ...args: any[]) => log(LogLevel.WARN, message, ...args),
  error: (message: string, ...args: any[]) => log(LogLevel.ERROR, message, ...args),
  
  // 获取日志文件路径
  getLogFilePath: () => logFile
};
