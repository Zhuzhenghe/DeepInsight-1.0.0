import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware/auth';
import { User } from '@/lib/db/schema';
import { syncQuotasFromConfig } from '../../../../scripts/syncQuotas';

export async function POST(request: NextRequest) {
  try {
    // 认证检查
    const authResult = await authMiddleware(request);
    if (authResult.status !== 200) return authResult;
    
    const user = (request as any).user as User;
    
    // 检查是否为管理员
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: '权限不足，需要管理员权限' },
        { status: 403 }
      );
    }
    
    // 执行配额同步
    const result = await syncQuotasFromConfig();
    
    return NextResponse.json({
      success: true,
      message: '配额同步成功',
      data: result
    });
    
  } catch (error) {
    console.error('配额同步API错误:', error);
    return NextResponse.json(
      { 
        error: '配额同步失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
} 