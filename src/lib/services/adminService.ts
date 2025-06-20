import { eq, desc, asc, and, gte, lte, like, sql } from 'drizzle-orm';
import db from '@/lib/db';
import { users, tokenUsage, chats, messages, userQuotas } from '@/lib/db/schema';
import type { User } from '@/lib/db/schema';

export interface UserWithStats extends User {
  totalTokens: number;
  totalChats: number;
  lastActiveAt?: string | null;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number; // 30天内活跃
  totalTokensUsed: number;
  totalChats: number;
  totalMessages: number;
  averageTokensPerUser: number;
  usersByRole: {
    free: number;
    pro: number;
    admin: number;
  };
  dailyStats: Array<{
    date: string;
    users: number;
    tokens: number;
    chats: number;
  }>;
  topModels: Array<{
    model: string;
    usage: number;
    percentage: number;
  }>;
}

export class AdminService {
  // 获取用户列表（带分页和搜索）
  static async getUsers(options: {
    limit?: number;
    offset?: number;
    search?: string;
    role?: string;
    sortBy?: 'createdAt' | 'username' | 'email' | 'lastLoginAt';
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    const {
      limit = 20,
      offset = 0,
      search,
      role,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    // 构建查询条件
    let whereConditions = [];
    if (search) {
      whereConditions.push(
        sql`${users.username} LIKE ${`%${search}%`} OR ${users.email} LIKE ${`%${search}%`}`
      );
    }
    if (role) {
      whereConditions.push(eq(users.role, role as any));
    }

    // 获取用户列表
    const userList = await db.query.users.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: sortOrder === 'desc' ? desc(users[sortBy]) : asc(users[sortBy]),
      limit,
      offset,
    });

    // 获取每个用户的统计信息
    const usersWithStats: UserWithStats[] = await Promise.all(
      userList.map(async (user) => {
        // 获取 token 使用总量
        const tokenStats = await db
          .select({
            totalTokens: sql<number>`COALESCE(SUM(${tokenUsage.tokensUsed}), 0)`,
          })
          .from(tokenUsage)
          .where(eq(tokenUsage.userId, user.id));

        // 获取聊天数量
        const chatStats = await db
          .select({
            totalChats: sql<number>`COUNT(*)`,
          })
          .from(chats)
          .where(eq(chats.userId, user.id));

        // 获取最后活跃时间
        const lastActivity = await db
          .select({
            lastActiveAt: tokenUsage.createdAt,
          })
          .from(tokenUsage)
          .where(eq(tokenUsage.userId, user.id))
          .orderBy(desc(tokenUsage.createdAt))
          .limit(1);

        return {
          ...user,
          totalTokens: Number(tokenStats[0]?.totalTokens || 0),
          totalChats: Number(chatStats[0]?.totalChats || 0),
          lastActiveAt: lastActivity[0]?.lastActiveAt || user.lastLoginAt,
        };
      })
    );

    // 获取总数
    const totalCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    return {
      users: usersWithStats,
      total: Number(totalCount[0]?.count || 0),
      limit,
      offset,
    };
  }

  // 获取单个用户详情
  static async getUserDetail(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    // 获取详细统计
    const [tokenStats, chatStats, quota, recentUsage] = await Promise.all([
      // Token 统计
      db
        .select({
          totalTokens: sql<number>`COALESCE(SUM(${tokenUsage.tokensUsed}), 0)`,
          totalCost: sql<number>`COALESCE(SUM(${tokenUsage.cost}), 0)`,
          usageCount: sql<number>`COUNT(*)`,
        })
        .from(tokenUsage)
        .where(eq(tokenUsage.userId, userId)),

      // 聊天统计
      db
        .select({
          totalChats: sql<number>`COUNT(DISTINCT ${chats.id})`,
          totalMessages: sql<number>`COUNT(*)`,
        })
        .from(messages)
        .leftJoin(chats, eq(messages.chatId, chats.id))
        .where(eq(chats.userId, userId)),

      // 配额信息
      db.query.userQuotas.findFirst({
        where: eq(userQuotas.userId, userId),
      }),

      // 最近使用记录
      db.query.tokenUsage.findMany({
        where: eq(tokenUsage.userId, userId),
        orderBy: desc(tokenUsage.createdAt),
        limit: 10,
      }),
    ]);

    return {
      user,
      stats: {
        totalTokens: Number(tokenStats[0]?.totalTokens || 0),
        totalCost: Number(tokenStats[0]?.totalCost || 0),
        usageCount: Number(tokenStats[0]?.usageCount || 0),
        totalChats: Number(chatStats[0]?.totalChats || 0),
        totalMessages: Number(chatStats[0]?.totalMessages || 0),
      },
      quota,
      recentUsage,
    };
  }

  // 更新用户信息
  static async updateUser(userId: string, updates: {
    role?: 'free' | 'pro' | 'admin';
    isActive?: boolean;
    dailyLimit?: number;
    monthlyLimit?: number;
  }) {
    const { role, isActive, dailyLimit, monthlyLimit } = updates;

    // 更新用户基本信息
    if (role !== undefined || isActive !== undefined) {
      await db.update(users)
        .set({
          ...(role !== undefined && { role }),
          ...(isActive !== undefined && { isActive }),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, userId));
    }

    // 更新配额信息
    if (dailyLimit !== undefined || monthlyLimit !== undefined) {
      const existingQuota = await db.query.userQuotas.findFirst({
        where: eq(userQuotas.userId, userId),
      });

      if (existingQuota) {
        await db.update(userQuotas)
          .set({
            ...(dailyLimit !== undefined && { dailyLimit }),
            ...(monthlyLimit !== undefined && { monthlyLimit }),
          })
          .where(eq(userQuotas.userId, userId));
      } else {
        await db.insert(userQuotas).values({
          userId,
          dailyLimit: dailyLimit || 1000,
          monthlyLimit: monthlyLimit || 30000,
          dailyUsed: 0,
          monthlyUsed: 0,
          resetDailyAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          resetMonthlyAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    }

    return { success: true };
  }

  // 获取系统统计
  static async getSystemStats(): Promise<SystemStats> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 基础统计
    const [userStats, tokenStats, chatStats, messageStats] = await Promise.all([
      // 用户统计
      db
        .select({
          totalUsers: sql<number>`COUNT(*)`,
          freeUsers: sql<number>`COUNT(CASE WHEN ${users.role} = 'free' THEN 1 END)`,
          proUsers: sql<number>`COUNT(CASE WHEN ${users.role} = 'pro' THEN 1 END)`,
          adminUsers: sql<number>`COUNT(CASE WHEN ${users.role} = 'admin' THEN 1 END)`,
        })
        .from(users),

      // Token 使用统计
      db
        .select({
          totalTokens: sql<number>`COALESCE(SUM(${tokenUsage.tokensUsed}), 0)`,
        })
        .from(tokenUsage),

      // 聊天统计
      db
        .select({
          totalChats: sql<number>`COUNT(*)`,
        })
        .from(chats),

      // 消息统计
      db
        .select({
          totalMessages: sql<number>`COUNT(*)`,
        })
        .from(messages),
    ]);

    // 活跃用户统计（30天内有使用记录）
    const activeUserStats = await db
      .select({
        activeUsers: sql<number>`COUNT(DISTINCT ${tokenUsage.userId})`,
      })
      .from(tokenUsage)
      .where(gte(tokenUsage.createdAt, thirtyDaysAgo.toISOString()));

    // 每日统计（最近7天）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailyStatsRaw = await db
      .select({
        date: sql<string>`DATE(${tokenUsage.createdAt})`,
        users: sql<number>`COUNT(DISTINCT ${tokenUsage.userId})`,
        tokens: sql<number>`COALESCE(SUM(${tokenUsage.tokensUsed}), 0)`,
      })
      .from(tokenUsage)
      .where(gte(tokenUsage.createdAt, sevenDaysAgo.toISOString()))
      .groupBy(sql`DATE(${tokenUsage.createdAt})`)
      .orderBy(sql`DATE(${tokenUsage.createdAt})`);

    // 补充聊天统计
    const dailyChatStats = await db
      .select({
        date: sql<string>`DATE(${chats.createdAt})`,
        chats: sql<number>`COUNT(*)`,
      })
      .from(chats)
      .where(gte(chats.createdAt, sevenDaysAgo.toISOString()))
      .groupBy(sql`DATE(${chats.createdAt})`);

    // 合并每日统计
    const dailyStatsMap = new Map();
    dailyStatsRaw.forEach(stat => {
      dailyStatsMap.set(stat.date, {
        date: stat.date,
        users: Number(stat.users),
        tokens: Number(stat.tokens),
        chats: 0,
      });
    });
    dailyChatStats.forEach(stat => {
      const existing = dailyStatsMap.get(stat.date);
      if (existing) {
        existing.chats = Number(stat.chats);
      }
    });

    // 模型使用统计
    const modelStats = await db
      .select({
        model: tokenUsage.modelName,
        usage: sql<number>`SUM(${tokenUsage.tokensUsed})`,
      })
      .from(tokenUsage)
      .groupBy(tokenUsage.modelName)
      .orderBy(desc(sql`SUM(${tokenUsage.tokensUsed})`))
      .limit(5);

    const totalModelUsage = modelStats.reduce((sum, stat) => sum + Number(stat.usage), 0);
    const topModels = modelStats.map(stat => ({
      model: stat.model,
      usage: Number(stat.usage),
      percentage: totalModelUsage > 0 ? (Number(stat.usage) / totalModelUsage) * 100 : 0,
    }));

    return {
      totalUsers: Number(userStats[0]?.totalUsers || 0),
      activeUsers: Number(activeUserStats[0]?.activeUsers || 0),
      totalTokensUsed: Number(tokenStats[0]?.totalTokens || 0),
      totalChats: Number(chatStats[0]?.totalChats || 0),
      totalMessages: Number(messageStats[0]?.totalMessages || 0),
      averageTokensPerUser: userStats[0]?.totalUsers 
        ? Number(tokenStats[0]?.totalTokens || 0) / Number(userStats[0].totalUsers)
        : 0,
      usersByRole: {
        free: Number(userStats[0]?.freeUsers || 0),
        pro: Number(userStats[0]?.proUsers || 0),
        admin: Number(userStats[0]?.adminUsers || 0),
      },
      dailyStats: Array.from(dailyStatsMap.values()),
      topModels,
    };
  }

  // 删除用户（软删除）
  static async deleteUser(userId: string) {
    await db.update(users)
      .set({
        isActive: false,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId));

    return { success: true };
  }
} 