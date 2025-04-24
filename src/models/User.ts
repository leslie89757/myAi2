import { DataTypes, Model, Optional } from 'sequelize';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import sequelize from '../config/database';

// 用户角色枚举
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

// 定义用户属性
interface UserAttributes {
  id: number;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  apiKey?: string;
  apiKeyUsage: number;
  apiKeyLimit: number;
  lastLoginAt?: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// 定义创建时可选属性
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'apiKey' | 'lastLoginAt' | 'createdAt' | 'updatedAt'> {}

// 定义用户模型
class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public username!: string;
  public email!: string;
  public password!: string;
  public role!: UserRole;
  public apiKey?: string;
  public apiKeyUsage!: number;
  public apiKeyLimit!: number;
  public lastLoginAt?: Date;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // 比较密码
  public async comparePassword(candidatePassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(candidatePassword, this.password);
    } catch (error: any) {
      logger.error(`密码比较错误: ${error.message}`);
      return false;
    }
  }

  // 生成JWT令牌
  public generateAuthToken(): string {
    const token = jwt.sign(
      { 
        id: this.id,
        username: this.username,
        email: this.email,
        role: this.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    return token;
  }

  // 生成API密钥
  public async generateApiKey(): Promise<string> {
    const apiKey = jwt.sign(
      { id: this.id },
      process.env.API_KEY_SECRET || 'your-api-key-secret',
      { expiresIn: '365d' }
    );
    this.apiKey = apiKey;
    await this.save();
    return apiKey;
  }
}

// 初始化用户模型
User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50]
      }
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    role: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: UserRole.USER,
      validate: {
        isIn: [Object.values(UserRole)]
      }
    },
    apiKey: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: true
    },
    apiKeyUsage: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    apiKeyLimit: {
      type: DataTypes.INTEGER,
      defaultValue: 100
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true
  }
);

// 添加钩子
User.beforeCreate(async (user: User) => {
  try {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  } catch (error: any) {
    logger.error(`密码哈希错误: ${error.message}`);
    throw new Error('密码哈希失败');
  }
});

User.beforeUpdate(async (user: User) => {
  if (user.changed('password')) {
    try {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    } catch (error: any) {
      logger.error(`密码哈希错误: ${error.message}`);
      throw new Error('密码哈希失败');
    }
  }
});

export default User;
