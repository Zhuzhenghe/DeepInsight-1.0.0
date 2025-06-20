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
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    // 获取使用历史
    const history = await UsageService.getUserUsageHistory(user.id, limit, offset);
    
    return NextResponse.json({
      history,
      limit,
      offset,
    });
  } catch (error) {
    console.error('获取使用历史失败:', error);
    return NextResponse.json(
      { error: '获取使用历史失败' },
      { status: 500 }
    );
  }
} 