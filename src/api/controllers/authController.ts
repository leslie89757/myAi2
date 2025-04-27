import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { PrismaClient } from '../../generated/prisma';
import logger from '../../utils/logger';
import { DualAuthRequest } from '../middleware/dualAuthMiddleware';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret-key';

// 生成访问令牌（短期）
const generateAccessToken = (user: any) => {
  return jwt.sign(
    { 
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      type: 'access'
    },
    JWT_SECRET,
    { expiresIn: '30m' } // 访问令牌有效期30分钟
  );
};

// 生成刷新令牌（长期）
const generateRefreshToken = (user: any) => {
  return jwt.sign(
    { 
      id: user.id, 
      type: 'refresh'
    },
    REFRESH_SECRET,
    { expiresIn: '7d' } // 刷新令牌有效期7天
  );
};

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - 认证
 *     summary: 用户登录/注册
 *     description: 使用用户名/邮箱和密码登录，如果用户不存在则自动注册新账号，获取JWT访问令牌和刷新令牌
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - login
 *               - password
 *             properties:
 *               login:
 *                 type: string
 *                 description: 用户名或电子邮件
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: 登录成功或注册并登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                 isNewUser:
 *                   type: boolean
 *                   description: 指示是否为新注册用户
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 认证失败
 *       500:
 *         description: 服务器错误
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { login, password } = req.body;

    // 验证请求参数
    if (!login || !password) {
      return res.status(400).json({ error: '用户名/邮箱和密码为必填项' });
    }

    // 判断login是邮箱还是用户名
    const isEmail = login.includes('@');
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: login },
          { email: login.toLowerCase() }
        ],
        isActive: true
      }
    });

    // 用户不存在，自动创建账号
    let isNewUser = false;
    if (!user) {
      // 生成盐和哈希密码
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // 确定用户名和邮箱
      let username, email;
      if (isEmail) {
        email = login.toLowerCase();
        // 从邮箱生成一个用户名 (使用@前的部分)
        username = login.split('@')[0];

        // 检查用户名是否已存在，如果存在则添加随机数
        const existingUsername = await prisma.user.findUnique({ where: { username } });
        if (existingUsername) {
          username = `${username}${Math.floor(Math.random() * 10000)}`;
        }
      } else {
        username = login;
        // 为用户名创建一个临时邮箱
        email = `${login.toLowerCase()}${Math.floor(Math.random() * 10000)}@temp.com`;
      }

      // 创建新用户
      user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          role: 'user',
          isActive: true,
          lastLoginAt: new Date()
          // createdAt 和 updatedAt 由 Prisma 自动设置
        }
      });

      logger.info(`新用户自动注册成功: ${username}`);
      isNewUser = true;
    } else {
      // 用户存在，验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        logger.warn(`登录失败：密码错误 ${login}`);
        return res.status(401).json({ error: '用户名/邮箱或密码错误' });
      }
    }

    // 生成访问令牌和刷新令牌
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // 记录刷新令牌
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天后过期
      }
    });

    // 更新最后登录时间（如果不是新用户）
    if (!isNewUser) {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });
      logger.info(`用户登录成功: ${user.username}`);
    }

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      isNewUser // 指示是否为新用户
    });
  } catch (error: any) {
    logger.error(`登录/注册错误: ${error.message}`);
    res.status(500).json({ error: `登录/注册失败: ${error.message}` });
  }
};

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags:
 *       - 认证
 *     summary: 刷新访问令牌
 *     description: 使用刷新令牌获取新的访问令牌，刷新令牌在Authorization请求头中提供
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 刷新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: 无效的刷新令牌
 *       500:
 *         description: 服务器错误
 */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    // 从authorization头获取刷新令牌
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未提供刷新令牌' });
    }

    const refreshToken = authHeader.split(' ')[1];
    
    try {
      // 验证刷新令牌
      const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as any;
      
      // 确保这是一个刷新令牌
      if (decoded.type !== 'refresh') {
        return res.status(401).json({ error: '提供的不是刷新令牌' });
      }

      // 查找刷新令牌记录
      const tokenRecord = await prisma.refreshToken.findFirst({
        where: {
          token: refreshToken,
          userId: decoded.id,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      if (!tokenRecord) {
        return res.status(401).json({ error: '刷新令牌已无效或过期' });
      }

      // 获取用户信息
      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      });

      if (!user || !user.isActive) {
        return res.status(401).json({ error: '用户不存在或已被禁用' });
      }

      // 生成新的访问令牌
      const accessToken = generateAccessToken(user);

      logger.info(`刷新令牌成功: ${user.username}`);
      res.json({
        success: true,
        accessToken
      });
    } catch (error: any) {
      logger.error(`刷新令牌验证错误: ${error.message}`);
      return res.status(401).json({ error: '无效的刷新令牌' });
    }
  } catch (error: any) {
    logger.error(`刷新令牌错误: ${error.message}`);
    res.status(500).json({ error: `刷新令牌失败: ${error.message}` });
  }
};

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - 认证
 *     summary: 用户登出
 *     description: 使当前访问令牌和刷新令牌失效
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 登出成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: 未认证
 *       500:
 *         description: 服务器错误
 */
export const logout = async (req: DualAuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    // 获取令牌
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      try {
        // 尝试分别验证是访问令牌还是刷新令牌
        try {
          // 验证是否为访问令牌
          const accessDecoded = jwt.verify(token, JWT_SECRET) as any;
          
          if (accessDecoded.type === 'access') {
            // 将访问令牌加入黑名单
            // 计算令牌过期时间
            const expiresAt = new Date(accessDecoded.exp * 1000);
            
            // 将令牌加入黑名单
            await prisma.blacklistedToken.create({
              data: {
                token,
                expiresAt
              }
            });
            
            logger.info(`已将访问令牌加入黑名单: ${req.user.username || req.user.id}`);
          }
        } catch (accessError) {
          // 不是有效的访问令牌，忽略错误
        }
        
        // 检查是否是刷新令牌
        try {
          const refreshDecoded = jwt.verify(token, REFRESH_SECRET) as any;
          if (refreshDecoded.type === 'refresh') {
            // 删除刷新令牌
            await prisma.refreshToken.deleteMany({
              where: {
                token,
                userId: req.user.id
              }
            });
            
            logger.info(`已删除刷新令牌: ${req.user.username || req.user.id}`);
          }
        } catch (refreshError) {
          // 不是有效的刷新令牌，忽略错误
        }
      } catch (error: any) {
        // 令牌返回格式错误，忽略
        logger.warn(`登出时令牌格式错误: ${error.message}`);
      }
    }

    logger.info(`用户登出成功: ${req.user.username || req.user.id}`);
    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error: any) {
    logger.error(`登出错误: ${error.message}`);
    res.status(500).json({ error: `登出失败: ${error.message}` });
  }
};

/**
 * @openapi
 * /api/auth/validate:
 *   get:
 *     tags:
 *       - 认证
 *     summary: 验证令牌
 *     description: 验证当前请求中的令牌是否有效
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 令牌有效
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: 令牌无效
 */
export const validateToken = async (req: DualAuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ valid: false });
    }

    res.json({
      valid: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        authMethod: req.authMethod
      }
    });
  } catch (error: any) {
    logger.error(`验证令牌错误: ${error.message}`);
    res.status(500).json({ error: `验证令牌失败: ${error.message}` });
  }
};
