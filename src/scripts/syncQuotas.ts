import db from '@/lib/db';
import { users, userQuotas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getFreeDailyTokens, getFreeMonthlyTokens } from '@/lib/config';

export async function syncQuotasFromConfig() {
  try {
    console.log('开始同步配额设置...');
    
    // 获取配置文件中的最新配额设置
    const newDailyLimit = getFreeDailyTokens();
    const newMonthlyLimit = getFreeMonthlyTokens();
    
    console.log(`配置文件中的配额设置：每日 ${newDailyLimit}, 每月 ${newMonthlyLimit}`);
    
    // 获取所有免费用户
    const freeUsers = await db.query.users.findMany({
      where: eq(users.role, 'free'),
    });
    
    console.log(`找到 ${freeUsers.length} 个免费用户需要更新配额`);
    
    let updatedCount = 0;
    
    for (const user of freeUsers) {
      // 检查用户是否有配额记录
      const existingQuota = await db.query.userQuotas.findFirst({
        where: eq(userQuotas.userId, user.id),
      });
      
      if (existingQuota) {
        // 更新现有配额记录
        await db.update(userQuotas)
          .set({
            dailyLimit: newDailyLimit,
            monthlyLimit: newMonthlyLimit,
          })
          .where(eq(userQuotas.userId, user.id));
        
        console.log(`已更新用户 ${user.username} 的配额`);
        updatedCount++;
      } else {
        // 为没有配额记录的用户创建配额
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        nextMonth.setHours(0, 0, 0, 0);
        
        await db.insert(userQuotas).values({
          userId: user.id,
          dailyLimit: newDailyLimit,
          monthlyLimit: newMonthlyLimit,
          dailyUsed: 0,
          monthlyUsed: 0,
          resetDailyAt: tomorrow.toISOString(),
          resetMonthlyAt: nextMonth.toISOString(),
        });
        
        console.log(`已为用户 ${user.username} 创建新的配额记录`);
        updatedCount++;
      }
    }
    
    console.log(`配额同步完成！总共更新了 ${updatedCount} 个用户的配额。`);
    
    return {
      success: true,
      message: `成功更新了 ${updatedCount} 个用户的配额`,
      updatedCount,
      totalUsers: freeUsers.length,
    };
    
  } catch (error) {
    console.error('配额同步失败:', error);
    throw error;
  }
}

// 如果直接运行这个脚本
if (require.main === module) {
  syncQuotasFromConfig()
    .then((result) => {
      console.log('同步结果:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('同步失败:', error);
      process.exit(1);
    });
} 