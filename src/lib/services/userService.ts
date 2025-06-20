import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import db from '@/lib/db';
import { users, userQuotas, sessions, type User, type NewUser } from '@/lib/db/schema';
import { hashPassword, comparePassword } from '@/lib/auth/password';
import { generateToken } from '@/lib/auth/jwt';
import { getFreeDailyTokens, getFreeMonthlyTokens } from '@/lib/config';

export interface CreateUserData {
  email: string;
  password: string;
  username: string;
  role?: 'free' | 'pro' | 'admin';
}

export interface LoginResult {
  user: User;
  token: string;
  sessionId: string;
}

export class UserService {
  // 创建新用户
  static async createUser(data: CreateUserData): Promise<User> {
    const { email, password, username, role = 'free' } = data;
    
    // 检查邮箱是否已存在
    const existingEmail = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    
    if (existingEmail) {
      throw new Error('该邮箱已被注册');
    }
    
    // 检查用户名是否已存在
    const existingUsername = await db.query.users.findFirst({
      where: eq(users.username, username),
    });
    
    if (existingUsername) {
      throw new Error('该用户名已被使用');
    }
    
    // 加密密码
    const hashedPassword = await hashPassword(password);
    
    // 创建用户
    const userId = uuidv4();
    const now = new Date().toISOString();
    
    const [newUser] = await db.insert(users).values({
      id: userId,
      email,
      password: hashedPassword,
      username,
      role,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    }).returning();
    
    // 创建用户配额
    const quotaLimits = this.getQuotaLimits(role);
    await db.insert(userQuotas).values({
      userId,
      dailyLimit: quotaLimits.daily,
      monthlyLimit: quotaLimits.monthly,
      dailyUsed: 0,
      monthlyUsed: 0,
      resetDailyAt: this.getNextResetTime('daily'),
      resetMonthlyAt: this.getNextResetTime('monthly'),
    });
    
    return newUser;
  }
  
  // 用户登录
  static async login(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<LoginResult> {
    // 查找用户
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    
    if (!user) {
      throw new Error('邮箱或密码错误');
    }
    
    if (!user.isActive) {
      throw new Error('账号已被禁用');
    }
    
    // 验证密码
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('邮箱或密码错误');
    }
    
    // 更新最后登录时间
    await db.update(users)
      .set({ lastLoginAt: new Date().toISOString() })
      .where(eq(users.id, user.id));
    
    // 生成 token
    const token = generateToken(user);
    
    // 创建会话
    const sessionId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7天后过期
    
    await db.insert(sessions).values({
      id: sessionId,
      userId: user.id,
      token,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      ipAddress,
      userAgent,
    });
    
    return { user, token, sessionId };
  }
  
  // 通过 ID 获取用户
  static async getUserById(userId: string): Promise<User | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    
    return user || null;
  }
  
  // 通过邮箱获取用户
  static async getUserByEmail(email: string): Promise<User | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    
    return user || null;
  }
  
  // 更新用户信息
  static async updateUser(userId: string, data: Partial<User>): Promise<User> {
    const [updatedUser] = await db.update(users)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error('用户不存在');
    }
    
    return updatedUser;
  }
  
  // 验证会话
  static async validateSession(token: string): Promise<User | null> {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.token, token),
    });
    
    if (!session) {
      return null;
    }
    
    // 检查是否过期
    if (new Date(session.expiresAt) < new Date()) {
      // 删除过期会话
      await db.delete(sessions).where(eq(sessions.id, session.id));
      return null;
    }
    
    // 获取用户信息
    return this.getUserById(session.userId);
  }
  
  // 登出
  static async logout(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  
  // 获取配额限制
  private static getQuotaLimits(role: string): { daily: number; monthly: number } {
    switch (role) {
      case 'admin':
      case 'pro':
        return { daily: -1, monthly: -1 }; // 无限制
      case 'free':
      default:
        return {
          daily: getFreeDailyTokens(),
          monthly: getFreeMonthlyTokens(),
        };
    }
  }
  
  // 获取下次重置时间
  private static getNextResetTime(type: 'daily' | 'monthly'): string {
    const now = new Date();
    
    if (type === 'daily') {
      // 第二天凌晨
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow.toISOString();
    } else {
      // 下个月1号凌晨
      const nextMonth = new Date(now);
      if (nextMonth.getMonth() === 11) {
        nextMonth.setFullYear(nextMonth.getFullYear() + 1);
        nextMonth.setMonth(0);
      } else {
        nextMonth.setMonth(nextMonth.getMonth() + 1);
      }
      nextMonth.setDate(1);
      nextMonth.setHours(0, 0, 0, 0);
      return nextMonth.toISOString();
    }
  }
} 