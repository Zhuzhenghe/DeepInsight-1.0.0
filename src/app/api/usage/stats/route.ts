import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware/auth';
import { UsageService } from '@/lib/services/usageService';

// 强制动态渲染
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // 认证检查
  const authResult = await authMiddleware(request);
  if (authResult.status !== 200) return authResult;
  
  try {
    const user = (request as any).user;
    
    // 获取使用统计
    const stats = await UsageService.getUserUsageStats(user.id);
    
    // 获取最近7天的使用汇总
    const summary = await UsageService.getUsageSummary(user.id, 7);
    
    return NextResponse.json({
      current: stats,
      summary: summary,
    });
  } catch (error) {
    console.error('获取使用统计失败:', error);
    return NextResponse.json(
      { error: '获取使用统计失败' },
      { status: 500 }
    );
  }
} 