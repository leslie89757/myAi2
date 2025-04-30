import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// 确保上传目录存在
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 按用户ID组织上传文件
const getUserUploadDir = (userId: string): string => {
  const userDir = path.join(uploadDir, userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
};

// 配置存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 注意：在multipart/form-data请求中，req.body可能在这个时候还没有被解析
    // 我们可以从URL参数中获取userId，或者使用默认值
    let userId = 'anonymous';
    try {
      // 尝试从URL查询参数获取userId
      if (req.query && req.query.userId) {
        userId = req.query.userId as string;
      }
    } catch (error) {
      logger.warn('无法从请求中获取userId，使用默认值');
    }
    
    const userDir = getUserUploadDir(userId);
    logger.info(`文件将上传到目录: ${userDir}`);
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名，保留原始扩展名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// 文件过滤器
const fileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  // 检查文件类型
  const allowedTypes = ['.pdf', '.txt', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型。仅支持 PDF, TXT, DOC, DOCX 格式'));
  }
};

// 创建multer实例
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 限制文件大小为50MB
  }
}).single('file'); // 使用single中间件处理单个文件上传，字段名为'file'

// 错误处理中间件
export const handleFileUploadErrors = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    // Multer错误
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小超过限制（最大50MB）' });
    }
    return res.status(400).json({ error: `文件上传错误: ${err.message}` });
  } else if (err) {
    // 其他错误
    logger.error(`文件上传错误: ${err.message}`);
    return res.status(400).json({ error: err.message });
  }
  next();
};

// 清理临时文件的函数
export const cleanupFile = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`已删除临时文件: ${filePath}`);
    }
  } catch (error: any) {
    logger.error(`删除临时文件失败: ${error.message}`);
  }
};
