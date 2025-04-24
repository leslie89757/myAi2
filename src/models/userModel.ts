import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

// 用户角色枚举
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

// 用户接口定义
export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  apiKey?: string;
  apiKeyUsage?: number;
  apiKeyLimit?: number;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
  generateApiKey(): string;
}

// 用户模式定义
const UserSchema: Schema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '请提供有效的电子邮件地址']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER
  },
  apiKey: {
    type: String,
    unique: true,
    sparse: true
  },
  apiKeyUsage: {
    type: Number,
    default: 0
  },
  apiKeyLimit: {
    type: Number,
    default: 100
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 保存前密码哈希
UserSchema.pre<IUser>('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    logger.error(`密码哈希错误: ${error.message}`);
    next(error);
  }
});

// 密码比较方法
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error: any) {
    logger.error(`密码比较错误: ${error.message}`);
    return false;
  }
};

// 生成JWT令牌
UserSchema.methods.generateAuthToken = function(): string {
  const token = jwt.sign(
    { 
      id: this._id,
      username: this.username,
      email: this.email,
      role: this.role 
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
  return token;
};

// 生成API密钥
UserSchema.methods.generateApiKey = function(): string {
  const apiKey = jwt.sign(
    { id: this._id },
    process.env.API_KEY_SECRET || 'your-api-key-secret',
    { expiresIn: '365d' }
  );
  this.apiKey = apiKey;
  return apiKey;
};

// 创建用户模型
const User = mongoose.model<IUser>('User', UserSchema);

export default User;
