import { v4 as uuidv4 } from 'uuid';
import { eq, and, gte, sql } from 'drizzle-orm';
import db from '@/lib/db';
import { tokenUsage, userQuotas, users, type TokenUsage, type UserQuota } from '@/lib/db/schema';

export interface UsageStats {
  dailyUsed: number;
  monthlyUsed: number;
  dailyLimit: number;
  monthlyLimit: number;
  isUnlimited: boolean;
}

export interface TokenCost {
  model: string;
  inputCost: number;  // 每1k tokens的成本
  outputCost: number; // 每1k tokens的成本
}

// 模型成本配置（示例值，实际应从配置文件读取）
const MODEL_COSTS: Record<string, TokenCost> = {
  'gpt-3.5-turbo': { model: 'gpt-3.5-turbo', inputCost: 0.0005, outputCost: 0.0015 },
  'gpt-4': { model: 'gpt-4', inputCost: 0.03, outputCost: 0.06 },
  'claude-3-opus': { model: 'claude-3-opus', inputCost: 0.015, outputCost: 0.075 },
  'claude-3-sonnet': { model: 'claude-3-sonnet', inputCost: 0.003, outputCost: 0.015 },
  'llama-3': { model: 'llama-3', inputCost: 0, outputCost: 0 }, // 本地模型无成本
};

export class UsageService {
  // 记录 Token 使用
  static async recordTokenUsage(
    userId: string,
    tokens: number,
    modelName: string,
    usageType: 'chat' | 'search' | 'image' | 'video',
    requestId?: string
  ): Promise<void> {
    const cost = this.calculateCost(tokens, modelName);
    
    // 记录使用详情
    await db.insert(tokenUsage).values({
      userId,
      tokensUsed: tokens,
      modelName,
      usageType,
      createdAt: new Date().toISOString(),
      requestId: requestId || uuidv4(),
      cost,
    });
    
    // 更新用户配额
    await this.updateUserQuota(userId, tokens);
  }
  
  // 获取用户使用统计
  static async getUserUsageStats(userId: string): Promise<UsageStats> {
    const quota = await db.query.userQuotas.findFirst({
      where: eq(userQuotas.userId, userId),
    });
    
    if (!quota) {
      // 如果没有配额记录，创建默认配额
      const defaultQuota = await this.createDefaultQuota(userId);
      return {
        dailyUsed: 0,
        monthlyUsed: 0,
        dailyLimit: defaultQuota.dailyLimit,
        monthlyLimit: defaultQuota.monthlyLimit,
        isUnlimited: defaultQuota.dailyLimit === -1,
      };
    }
    
    // 检查是否需要重置
    await this.checkAndResetQuota(quota);
    
    // 重新获取更新后的配额
    const updatedQuota = await db.query.userQuotas.findFirst({
      where: eq(userQuotas.userId, userId),
    });
    
    return {
      dailyUsed: updatedQuota?.dailyUsed || 0,
      monthlyUsed: updatedQuota?.monthlyUsed || 0,
      dailyLimit: updatedQuota?.dailyLimit || 1000,
      monthlyLimit: updatedQuota?.monthlyLimit || 30000,
      isUnlimited: (updatedQuota?.dailyLimit || 0) === -1,
    };
  }
  
  // 检查用户是否有足够的配额
  static async checkQuota(userId: string, requiredTokens: number = 0): Promise<{ allowed: boolean; reason?: string; type?: 'daily' | 'monthly' }> {
    const stats = await this.getUserUsageStats(userId);
    
    if (stats.isUnlimited) {
      return { allowed: true };
    }
    
    if (stats.dailyUsed + requiredTokens > stats.dailyLimit) {
      return { allowed: false, reason: 'DAILY_QUOTA_EXCEEDED', type: 'daily' };
    }
    
    if (stats.monthlyUsed + requiredTokens > stats.monthlyLimit) {
      return { allowed: false, reason: 'MONTHLY_QUOTA_EXCEEDED', type: 'monthly' };
    }
    
    return { allowed: true };
  }
  
  // 获取用户使用历史
  static async getUserUsageHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<TokenUsage[]> {
    return await db.query.tokenUsage.findMany({
      where: eq(tokenUsage.userId, userId),
      orderBy: (tokenUsage, { desc }) => [desc(tokenUsage.createdAt)],
      limit,
      offset,
    });
  }
  
  // 获取使用量汇总
  static async getUsageSummary(userId: string, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const usage = await db.query.tokenUsage.findMany({
      where: and(
        eq(tokenUsage.userId, userId),
        gte(tokenUsage.createdAt, startDate.toISOString())
      ),
    });
    
    // 按日期分组
    const dailyUsage: Record<string, number> = {};
    const modelUsage: Record<string, number> = {};
    const typeUsage: Record<string, number> = {};
    let totalCost = 0;
    
    usage.forEach((record) => {
      const date = new Date(record.createdAt).toISOString().split('T')[0];
      dailyUsage[date] = (dailyUsage[date] || 0) + record.tokensUsed;
      modelUsage[record.modelName] = (modelUsage[record.modelName] || 0) + record.tokensUsed;
      typeUsage[record.usageType] = (typeUsage[record.usageType] || 0) + record.tokensUsed;
      totalCost += record.cost || 0;
    });
    
    return {
      dailyUsage,
      modelUsage,
      typeUsage,
      totalTokens: usage.reduce((sum, record) => sum + record.tokensUsed, 0),
      totalCost,
      recordCount: usage.length,
    };
  }
  
  // 私有方法：更新用户配额
  private static async updateUserQuota(userId: string, tokens: number): Promise<void> {
    const quota = await db.query.userQuotas.findFirst({
      where: eq(userQuotas.userId, userId),
    });
    
    if (!quota) {
      await this.createDefaultQuota(userId);
      return;
    }
    
    // 检查是否需要重置
    await this.checkAndResetQuota(quota);
    
    // 更新使用量（如果不是无限制）
    if (quota.dailyLimit !== -1) {
      await db.update(userQuotas)
        .set({
          dailyUsed: sql`${userQuotas.dailyUsed} + ${tokens}`,
          monthlyUsed: sql`${userQuotas.monthlyUsed} + ${tokens}`,
        })
        .where(eq(userQuotas.userId, userId));
    }
  }
  
  // 创建默认配额
  private static async createDefaultQuota(userId: string): Promise<UserQuota> {
    // 根据用户角色获取默认配额
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    
    const isUnlimited = user?.role === 'admin' || user?.role === 'pro';
    const now = new Date();
    
    const [quota] = await db.insert(userQuotas).values({
      userId,
      dailyLimit: isUnlimited ? -1 : 1000,
      monthlyLimit: isUnlimited ? -1 : 30000,
      dailyUsed: 0,
      monthlyUsed: 0,
      resetDailyAt: this.getNextResetTime('daily'),
      resetMonthlyAt: this.getNextResetTime('monthly'),
    }).returning();
    
    return quota;
  }
  
  // 检查并重置配额
  private static async checkAndResetQuota(quota: UserQuota): Promise<void> {
    const now = new Date();
    let needsUpdate = false;
    const updates: Partial<UserQuota> = {};
    
    // 检查每日重置
    if (new Date(quota.resetDailyAt) <= now) {
      updates.dailyUsed = 0;
      updates.resetDailyAt = this.getNextResetTime('daily');
      needsUpdate = true;
    }
    
    // 检查每月重置
    if (new Date(quota.resetMonthlyAt) <= now) {
      updates.monthlyUsed = 0;
      updates.resetMonthlyAt = this.getNextResetTime('monthly');
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      await db.update(userQuotas)
        .set(updates)
        .where(eq(userQuotas.id, quota.id));
    }
  }
  
  // 计算成本
  private static calculateCost(tokens: number, modelName: string): number {
    const cost = MODEL_COSTS[modelName];
    if (!cost) return 0;
    
    // 简化计算，假设输入输出各占一半
    const inputTokens = tokens / 2;
    const outputTokens = tokens / 2;
    
    return (inputTokens / 1000 * cost.inputCost) + (outputTokens / 1000 * cost.outputCost);
  }
  
  // 获取下次重置时间
  private static getNextResetTime(type: 'daily' | 'monthly'): string {
    const now = new Date();
    
    if (type === 'daily') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow.toISOString();
    } else {
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