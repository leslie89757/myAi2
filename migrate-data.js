// 数据迁移脚本 - 从本地数据库迁移到阿里云RDS
const { PrismaClient: LocalPrismaClient } = require('./src/generated/prisma');
const { Prisma } = require('./src/generated/prisma');

// 创建本地和远程prisma客户端
const localPrisma = new LocalPrismaClient({
  datasources: {
    db: {
      url: 'postgresql://guzhenqiang:@localhost:5432/chatgpt_api'
    }
  }
});

const remotePrisma = new LocalPrismaClient({
  datasources: {
    db: {
      url: 'postgresql://myai:tUkkid-9pafme-mettom@pgm-bp150nm5m2hlgtk9yo.pg.rds.aliyuncs.com:5432/myai'
    }
  }
});

// 辅助函数：打印进度
function logProgress(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// 迁移用户数据
async function migrateUsers() {
  logProgress('开始迁移用户数据...');
  const users = await localPrisma.user.findMany();
  logProgress(`找到 ${users.length} 个用户记录`);
  
  for (const user of users) {
    try {
      // 删除现有的用户，如果存在
      try {
        await remotePrisma.user.delete({
          where: { id: user.id }
        });
      } catch (error) {
        // 用户可能不存在，忽略错误
      }
      
      // 创建新用户
      await remotePrisma.user.create({
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          password: user.password,
          role: user.role,
          apiKey: user.apiKey,
          apiKeyUsage: user.apiKeyUsage,
          apiKeyLimit: user.apiKeyLimit,
          lastLoginAt: user.lastLoginAt,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
      logProgress(`迁移用户成功: ${user.username} (ID: ${user.id})`);
    } catch (error) {
      logProgress(`迁移用户失败: ${user.username} (ID: ${user.id}) - ${error.message}`);
    }
  }
}

// 迁移会话数据
async function migrateSessions() {
  logProgress('开始迁移会话数据...');
  const sessions = await localPrisma.session.findMany();
  logProgress(`找到 ${sessions.length} 个会话记录`);
  
  for (const session of sessions) {
    try {
      // 删除现有的会话，如果存在
      try {
        await remotePrisma.session.delete({
          where: { id: session.id }
        });
      } catch (error) {
        // 会话可能不存在，忽略错误
      }
      
      // 创建新会话
      await remotePrisma.session.create({
        data: {
          id: session.id,
          title: session.title,
          description: session.description,
          userId: session.userId,
          adminId: session.adminId,
          isActive: session.isActive,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt
        }
      });
      logProgress(`迁移会话成功: ${session.title} (ID: ${session.id})`);
    } catch (error) {
      logProgress(`迁移会话失败: ${session.title} (ID: ${session.id}) - ${error.message}`);
    }
  }
}

// 迁移聊天消息数据
async function migrateChatMessages() {
  logProgress('开始迁移聊天消息数据...');
  const messages = await localPrisma.chatMessage.findMany();
  logProgress(`找到 ${messages.length} 条聊天消息`);
  
  for (const message of messages) {
    try {
      // 删除现有的消息，如果存在
      try {
        await remotePrisma.chatMessage.delete({
          where: { id: message.id }
        });
      } catch (error) {
        // 消息可能不存在，忽略错误
      }
      
      // 创建新消息
      await remotePrisma.chatMessage.create({
        data: {
          id: message.id,
          sessionId: message.sessionId,
          role: message.role,
          content: message.content,
          tokens: message.tokens,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt
        }
      });
      logProgress(`迁移消息成功: (ID: ${message.id})`);
    } catch (error) {
      logProgress(`迁移消息失败: (ID: ${message.id}) - ${error.message}`);
    }
  }
}

// 迁移系统配置
async function migrateSystemConfig() {
  logProgress('开始迁移系统配置数据...');
  const configs = await localPrisma.systemConfig.findMany();
  logProgress(`找到 ${configs.length} 条系统配置`);
  
  for (const config of configs) {
    try {
      // 删除现有的配置，如果存在
      try {
        await remotePrisma.systemConfig.delete({
          where: { id: config.id }
        });
      } catch (error) {
        // 配置可能不存在，忽略错误
      }
      
      // 创建新配置
      await remotePrisma.systemConfig.create({
        data: {
          id: config.id,
          key: config.key,
          value: config.value,
          description: config.description,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt
        }
      });
      logProgress(`迁移系统配置成功: ${config.key} (ID: ${config.id})`);
    } catch (error) {
      logProgress(`迁移系统配置失败: ${config.key} (ID: ${config.id}) - ${error.message}`);
    }
  }
}

// 迁移系统提示词
async function migrateSystemPrompts() {
  logProgress('开始迁移系统提示词数据...');
  const prompts = await localPrisma.systemPrompt.findMany();
  logProgress(`找到 ${prompts.length} 条系统提示词`);
  
  for (const prompt of prompts) {
    try {
      // 删除现有的提示词，如果存在
      try {
        await remotePrisma.systemPrompt.delete({
          where: { id: prompt.id }
        });
      } catch (error) {
        // 提示词可能不存在，忽略错误
      }
      
      // 创建新提示词
      await remotePrisma.systemPrompt.create({
        data: {
          id: prompt.id,
          name: prompt.name,
          content: prompt.content,
          type: prompt.type,
          isDefault: prompt.isDefault,
          createdAt: prompt.createdAt,
          updatedAt: prompt.updatedAt
        }
      });
      logProgress(`迁移系统提示词成功: ${prompt.name} (ID: ${prompt.id})`);
    } catch (error) {
      logProgress(`迁移系统提示词失败: ${prompt.name} (ID: ${prompt.id}) - ${error.message}`);
    }
  }
}

// 迁移刷新令牌
async function migrateRefreshTokens() {
  logProgress('开始迁移刷新令牌数据...');
  const tokens = await localPrisma.refreshToken.findMany();
  logProgress(`找到 ${tokens.length} 个刷新令牌`);
  
  for (const token of tokens) {
    try {
      // 删除现有的令牌，如果存在
      try {
        await remotePrisma.refreshToken.delete({
          where: { id: token.id }
        });
      } catch (error) {
        // 令牌可能不存在，忽略错误
      }
      
      // 创建新令牌
      await remotePrisma.refreshToken.create({
        data: {
          id: token.id,
          token: token.token,
          userId: token.userId,
          expiresAt: token.expiresAt,
          createdAt: token.createdAt,
          updatedAt: token.updatedAt
        }
      });
      logProgress(`迁移刷新令牌成功: (ID: ${token.id})`);
    } catch (error) {
      logProgress(`迁移刷新令牌失败: (ID: ${token.id}) - ${error.message}`);
    }
  }
}

// 迁移黑名单令牌
async function migrateBlacklistedTokens() {
  logProgress('开始迁移黑名单令牌数据...');
  const tokens = await localPrisma.blacklistedToken.findMany();
  logProgress(`找到 ${tokens.length} 个黑名单令牌`);
  
  for (const token of tokens) {
    try {
      // 删除现有的令牌，如果存在
      try {
        await remotePrisma.blacklistedToken.delete({
          where: { id: token.id }
        });
      } catch (error) {
        // 令牌可能不存在，忽略错误
      }
      
      // 创建新令牌
      await remotePrisma.blacklistedToken.create({
        data: {
          id: token.id,
          token: token.token,
          expiresAt: token.expiresAt,
          createdAt: token.createdAt
        }
      });
      logProgress(`迁移黑名单令牌成功: (ID: ${token.id})`);
    } catch (error) {
      logProgress(`迁移黑名单令牌失败: (ID: ${token.id}) - ${error.message}`);
    }
  }
}

// 迁移管理员数据
async function migrateAdmins() {
  logProgress('开始迁移管理员数据...');
  const admins = await localPrisma.admin.findMany();
  logProgress(`找到 ${admins.length} 个管理员记录`);
  
  for (const admin of admins) {
    try {
      // 删除现有的管理员，如果存在
      try {
        await remotePrisma.admin.delete({
          where: { id: admin.id }
        });
      } catch (error) {
        // 管理员可能不存在，忽略错误
      }
      
      // 创建新管理员
      await remotePrisma.admin.create({
        data: {
          id: admin.id,
          email: admin.email,
          username: admin.username,
          password: admin.password,
          apiKey: admin.apiKey,
          role: admin.role,
          status: admin.status,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt
        }
      });
      logProgress(`迁移管理员成功: ${admin.username} (ID: ${admin.id})`);
    } catch (error) {
      logProgress(`迁移管理员失败: ${admin.username} (ID: ${admin.id}) - ${error.message}`);
    }
  }
}

// 主函数：执行所有迁移操作
async function migrateAll() {
  try {
    logProgress('开始数据迁移...');
    
    // 按照依赖关系顺序执行迁移
    await migrateUsers();
    await migrateAdmins();
    await migrateSessions();
    await migrateChatMessages();
    await migrateSystemConfig();
    await migrateSystemPrompts();
    await migrateRefreshTokens();
    await migrateBlacklistedTokens();
    
    logProgress('数据迁移完成!');
  } catch (error) {
    logProgress(`迁移过程中发生错误: ${error.message}`);
    console.error(error);
  } finally {
    // 关闭数据库连接
    await localPrisma.$disconnect();
    await remotePrisma.$disconnect();
  }
}

// 执行迁移
migrateAll();
