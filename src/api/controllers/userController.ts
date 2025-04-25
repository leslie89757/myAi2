import { Request, Response } from 'express';
import { UserRole } from '../../generated/prisma';
import { UserService } from '../../services/userService';
import logger from '../../utils/logger';
import { AuthRequest } from '../middleware/authMiddleware';

/**
 * 用户注册
 * @openapi
 * /api/users/register:
 *   post:
 *     tags:
 *       - 用户管理
 *     summary: 用户注册
 *     description: 创建新用户账号
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 电子邮件地址
 *               password:
 *                 type: string
 *                 format: password
 *                 description: 密码
 *     responses:
 *       201:
 *         description: 用户创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       400:
 *         description: 请求参数错误
 *       409:
 *         description: 用户名或邮箱已存在
 *       500:
 *         description: 服务器错误
 */
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    // 验证请求参数
    if (!username || !email || !password) {
      return res.status(400).json({ error: '用户名、邮箱和密码为必填项' });
    }

    // 检查用户名和邮箱是否已存在
    const existingUser = await UserService.findByUsernameOrEmail(username) || await UserService.findByUsernameOrEmail(email);

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(409).json({ error: '用户名已存在' });
      }
      if (existingUser.email === email) {
        return res.status(409).json({ error: '邮箱已被注册' });
      }
    }

    // 创建新用户
    const user = await UserService.createUser({
      username,
      email,
      password,
      role: 'user'
    });

    // 生成认证令牌
    const token = UserService.generateAuthToken(user);

    // 返回用户信息（不包含密码）
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    logger.info(`新用户注册成功: ${username}`);
    res.status(201).json({
      success: true,
      message: '用户注册成功',
      token,
      user: userResponse
    });
  } catch (error: any) {
    logger.error(`用户注册错误: ${error.message}`);
    res.status(500).json({ error: `用户注册失败: ${error.message}` });
  }
};

/**
 * 用户登录
 * @openapi
 * /api/users/login:
 *   post:
 *     tags:
 *       - 用户管理
 *     summary: 用户登录
 *     description: 使用用户名/邮箱和密码登录
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
 *                 description: 密码
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 认证失败
 *       500:
 *         description: 服务器错误
 */
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { login, password } = req.body;

    // 验证请求参数
    if (!login || !password) {
      return res.status(400).json({ error: '用户名/邮箱和密码为必填项' });
    }

    // 查找用户（支持用户名或邮箱登录）
    const user = await UserService.findByUsernameOrEmail(login);

    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    // 检查用户是否被禁用
    if (!user.isActive) {
      return res.status(401).json({ error: '账号已被禁用' });
    }

    // 验证密码
    const isPasswordValid = await UserService.comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: '密码错误' });
    }

    // 更新最后登录时间
    await UserService.updateUser(user.id, {
      lastLoginAt: new Date()
    });

    // 生成认证令牌
    const token = UserService.generateAuthToken(user);

    // 返回用户信息（不包含密码）
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    logger.info(`用户登录成功: ${user.username}`);
    res.status(200).json({
      success: true,
      message: '登录成功',
      token,
      user: userResponse
    });
  } catch (error: any) {
    logger.error(`用户登录错误: ${error.message}`);
    res.status(500).json({ error: `登录失败: ${error.message}` });
  }
};

/**
 * 获取当前用户信息
 * @openapi
 * /api/users/me:
 *   get:
 *     tags:
 *       - 用户管理
 *     summary: 获取当前用户信息
 *     description: 获取已认证用户的个人信息
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取用户信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     lastLoginAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: 未认证
 *       500:
 *         description: 服务器错误
 */
export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    // 返回用户信息（不包含密码）
    const userResponse = {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      createdAt: req.user.createdAt,
      lastLoginAt: req.user.lastLoginAt
    };

    res.status(200).json({ user: userResponse });
  } catch (error: any) {
    logger.error(`获取用户信息错误: ${error.message}`);
    res.status(500).json({ error: `获取用户信息失败: ${error.message}` });
  }
};

/**
 * 更新当前用户信息
 * @openapi
 * /api/users/me:
 *   put:
 *     tags:
 *       - 用户管理
 *     summary: 更新当前用户信息
 *     description: 更新已认证用户的个人信息
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: 新用户名
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 新电子邮件地址
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: 当前密码（更新密码时需要）
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: 新密码
 *     responses:
 *       200:
 *         description: 用户信息更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未认证或密码错误
 *       409:
 *         description: 用户名或邮箱已存在
 *       500:
 *         description: 服务器错误
 */
export const updateCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    const { username, email, currentPassword, newPassword } = req.body;
    const user = req.user;
    const userData: any = {};

    // 检查是否要更新用户名
    if (username && username !== user.username) {
      // 检查用户名是否已存在
      const existingUser = await UserService.findByUsernameOrEmail(username);
      if (existingUser && existingUser.id !== user.id) {
        return res.status(409).json({ error: '用户名已存在' });
      }
      userData.username = username;
    }

    // 检查是否要更新邮箱
    if (email && email !== user.email) {
      // 检查邮箱是否已存在
      const existingUser = await UserService.findByUsernameOrEmail(email.toLowerCase());
      if (existingUser && existingUser.id !== user.id) {
        return res.status(409).json({ error: '邮箱已被注册' });
      }
      userData.email = email.toLowerCase();
    }

    // 检查是否要更新密码
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: '更新密码需要提供当前密码' });
      }

      // 验证当前密码
      const isPasswordValid = await UserService.comparePassword(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: '当前密码错误' });
      }

      // 更新密码
      userData.password = newPassword;
    }

    // 保存更新
    const updatedUser = await UserService.updateUser(user.id, userData);

    // 返回更新后的用户信息（不包含密码）
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email
    };

    logger.info(`用户信息更新成功: ${user.username}`);
    res.status(200).json({
      success: true,
      message: '用户信息更新成功',
      user: userResponse
    });
  } catch (error: any) {
    logger.error(`更新用户信息错误: ${error.message}`);
    res.status(500).json({ error: `更新用户信息失败: ${error.message}` });
  }
};

/**
 * 生成 API 密钥
 * @openapi
 * /api/users/api-key:
 *   post:
 *     tags:
 *       - 用户管理
 *     summary: 生成 API 密钥
 *     description: 为当前用户生成新的 API 密钥
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: API 密钥生成成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 apiKey:
 *                   type: string
 *       401:
 *         description: 未认证
 *       500:
 *         description: 服务器错误
 */
export const generateApiKey = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    // 生成 API 密钥
    const apiKey = await UserService.generateApiKey(req.user.id);

    logger.info(`用户 ${req.user.username} 生成了新的 API 密钥`);
    res.status(200).json({
      success: true,
      message: 'API 密钥生成成功',
      apiKey
    });
  } catch (error: any) {
    logger.error(`生成 API 密钥错误: ${error.message}`);
    res.status(500).json({ error: `生成 API 密钥失败: ${error.message}` });
  }
};

/**
 * 获取 API 使用情况
 * @openapi
 * /api/users/api-usage:
 *   get:
 *     tags:
 *       - 用户管理
 *     summary: 获取 API 使用情况
 *     description: 获取当前用户的 API 使用统计
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取 API 使用情况
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 apiKeyExists:
 *                   type: boolean
 *                 usage:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 percentage:
 *                   type: number
 *       401:
 *         description: 未认证
 *       500:
 *         description: 服务器错误
 */
export const getApiUsage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    const apiKeyExists = !!req.user.apiKey;
    const usage = req.user.apiKeyUsage || 0;
    const limit = req.user.apiKeyLimit || 100;
    const percentage = (usage / limit) * 100;

    res.status(200).json({
      apiKeyExists,
      usage,
      limit,
      percentage
    });
  } catch (error: any) {
    logger.error(`获取 API 使用情况错误: ${error.message}`);
    res.status(500).json({ error: `获取 API 使用情况失败: ${error.message}` });
  }
};
