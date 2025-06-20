import db from './index';
import { users, userQuotas } from './schema';
import { UserService } from '@/lib/services/userService';
import { UsageService } from '@/lib/services/usageService';
import { getInitialAdminEmail, getInitialAdminPassword, getInitialAdminUsername } from '@/lib/config';

export async function initializeDatabase() {
  try {
    console.log('开始初始化数据库...');
    
    // 检查是否已有管理员账号
    const adminEmail = getInitialAdminEmail();
    const existingAdmin = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, adminEmail),
    });
    
    if (!existingAdmin) {
      console.log('创建初始管理员账号...');
      
      // 创建管理员账号
      await UserService.createUser({
        email: adminEmail,
        password: getInitialAdminPassword(),
        username: getInitialAdminUsername(),
        role: 'admin',
      });
      
      console.log('管理员账号创建成功！');
      console.log(`邮箱: ${adminEmail}`);
      console.log('请登录后立即修改密码！');
    } else {
      console.log('管理员账号已存在，跳过创建。');
    }
    
    // 为所有没有配额记录的用户创建默认配额
    console.log('检查用户配额...');
    const allUsers = await db.query.users.findMany();
    
    for (const user of allUsers) {
      const existingQuota = await db.query.userQuotas.findFirst({
        where: (userQuotas, { eq }) => eq(userQuotas.userId, user.id),
      });
      
      if (!existingQuota) {
        console.log(`为用户 ${user.username} 创建默认配额...`);
        await UsageService.getUserUsageStats(user.id); // 这会自动创建配额记录
      }
    }
    
    console.log('数据库初始化完成！');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

// 如果直接运行此文件，执行初始化
if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
} 