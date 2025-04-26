import { Response } from 'express';
import { PrismaClient } from '../../generated/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AdminRequest } from '../middlewares/adminAuthMiddleware';
import logger from '../../utils/logger';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_ADMIN_SECRET || 'admin-jwt-secret-key';
const SALT_ROUNDS = 10;

/**
 * 管理员登录
 */
export const login = async (req: AdminRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码为必填项' });
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: '邮箱或密码不正确' });
    }

    // 检查用户角色
    if (user.role !== 'admin') {
      return res.status(403).json({ error: '用户不具备管理员权限' });
    }

    // 检查用户状态
    if (!user.isActive) {
      return res.status(403).json({ error: '管理员账号已被禁用' });
    }

    // 验证密码
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: '邮箱或密码不正确' });
    }

    // 生成JWT令牌
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const formattedUser = {
      ...user,
      role: user.role.toString(),
      id: user.id.toString(),
      status: user.isActive ? 'active' : 'blocked'
    };

    res.json({
      token,
      user: formattedUser
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`管理员登录错误: ${err.message}`);
    res.status(500).json({ error: '登录处理失败' });
  }
};

/**
 * 获取所有用户
 */
export const getUsers = async (req: AdminRequest, res: Response) => {
  try {
    // 获取查询参数
    const { _sort, _order, _start, _end, ...filter } = req.query as any;
    const sortField = _sort || 'createdAt';
    const sortOrder = _order === 'DESC' ? 'desc' : 'asc';
    const start = parseInt(_start || '0', 10);
    const end = parseInt(_end || '10', 10);
    const limit = end - start;

    // 构建过滤条件
    const where: any = {};
    if (filter.q) {
      where.OR = [
        { email: { contains: filter.q, mode: 'insensitive' } },
        { username: { contains: filter.q, mode: 'insensitive' } }
      ];
    }
    if (filter.status) {
      where.isActive = filter.status === 'active';
    }
    if (filter.role) {
      where.role = filter.role;
    }

    // 查询用户并分页
    const users = await prisma.user.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: start,
      take: limit,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
      }  // 不返回密码字段
    });

    // 获取总数
    const total = await prisma.user.count({ where });

    // 转换和规范化数据以适合前端显示
    const formattedUsers = users.map(user => ({
      ...user,
      role: user.role.toString(),
      id: user.id.toString(),
      status: user.isActive ? 'active' : 'blocked'
    }));

    // 设置Content-Range头部
    res.set('Content-Range', `users ${start}-${Math.min(end, total)}/${total}`);
    res.json(formattedUsers);
  } catch (error) {
    const err = error as Error;
    logger.error(`获取用户列表错误: ${err.message}`);
    res.status(500).json({ error: '获取用户列表失败' });
  }
};

/**
 * 获取单个用户
 */
export const getUserById = async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return res.status(400).json({ error: '无效的用户ID' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
      }  // 不返回密码和API密钥
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const formattedUser = {
      ...user,
      role: user.role.toString(),
      id: user.id.toString(),
      status: user.isActive ? 'active' : 'blocked'
    };

    res.json(formattedUser);
  } catch (error) {
    const err = error as Error;
    logger.error(`获取用户详情错误: ${err.message}`);
    res.status(500).json({ error: '获取用户详情失败' });
  }
};

/**
 * 创建用户
 */
export const createUser = async (req: AdminRequest, res: Response) => {
  try {
    const { email, username, password, role = 'user', status = 'active' } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: '邮箱、用户名和密码为必填项' });
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: '该邮箱已被注册' });
    }

    // 验证角色是否有效
    if (role !== 'user' && role !== 'admin') {
      return res.status(400).json({ error: '无效的用户角色' });
    }

    // 验证状态是否有效
    if (status !== 'active' && status !== 'blocked') {
      return res.status(400).json({ error: '无效的用户状态' });
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 创建用户
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role,
        isActive: status === 'active'
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
      }
    });

    const formattedUser = {
      ...newUser,
      role: newUser.role.toString(),
      id: newUser.id.toString(),
      status: newUser.isActive ? 'active' : 'blocked'
    };

    res.status(201).json(formattedUser);
  } catch (error) {
    const err = error as Error;
    logger.error(`创建用户错误: ${err.message}`);
    res.status(500).json({ error: '创建用户失败' });
  }
};

/**
 * 更新用户
 */
export const updateUser = async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return res.status(400).json({ error: '无效的用户ID' });
    }

    const { email, username, password, role, status } = req.body;
    
    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 准备更新数据
    const updateData: any = {};
    
    if (email) updateData.email = email;
    if (username) updateData.username = username;
    if (password) updateData.password = await bcrypt.hash(password, SALT_ROUNDS);
    if (role && (role === 'user' || role === 'admin')) updateData.role = role;
    if (status && (status === 'active' || status === 'blocked')) updateData.isActive = status === 'active';

    // 更新用户
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
      }
    });

    const formattedUser = {
      ...updatedUser,
      role: updatedUser.role.toString(),
      id: updatedUser.id.toString(),
      status: updatedUser.isActive ? 'active' : 'blocked'
    };

    res.json(formattedUser);
  } catch (error) {
    const err = error as Error;
    logger.error(`更新用户错误: ${err.message}`);
    res.status(500).json({ error: '更新用户失败' });
  }
};

/**
 * 更新用户状态（封禁/解封）
 */
export const updateUserStatus = async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return res.status(400).json({ error: '无效的用户ID' });
    }

    const { status } = req.body;
    
    if (!status || (status !== 'active' && status !== 'blocked')) {
      return res.status(400).json({ error: '无效的用户状态' });
    }

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 不允许管理员更改自己的状态为 blocked
    if (userId === req.admin?.id && status === 'blocked') {
      return res.status(403).json({ error: '不能封禁自己的账号' });
    }

    // 更新用户状态
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: status === 'active' },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
      }
    });

    const formattedUser = {
      ...updatedUser,
      role: updatedUser.role.toString(),
      id: updatedUser.id.toString(),
      status: updatedUser.isActive ? 'active' : 'blocked'
    };

    res.json(formattedUser);
  } catch (error) {
    const err = error as Error;
    logger.error(`更新用户状态错误: ${err.message}`);
    res.status(500).json({ error: '更新用户状态失败' });
  }
};

/**
 * 删除用户
 */
export const deleteUser = async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return res.status(400).json({ error: '无效的用户ID' });
    }

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 不允许管理员删除自己
    if (userId === req.admin?.id) {
      return res.status(403).json({ error: '不能删除自己的账号' });
    }

    // 删除用户相关的会话和消息
    await prisma.$transaction([
      // 删除用户的聊天消息
      prisma.chatMessage.deleteMany({
        where: {
          session: {
            userId: userId
          }
        }
      }),
      // 删除用户的会话
      prisma.session.deleteMany({
        where: { userId }
      }),
      // 删除用户本身
      prisma.user.delete({
        where: { id: userId }
      })
    ]);

    res.json({ success: true });
  } catch (error) {
    const err = error as Error;
    logger.error(`删除用户错误: ${err.message}`);
    res.status(500).json({ error: '删除用户失败' });
  }
};
