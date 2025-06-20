import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware/auth';
import { AdminService } from '@/lib/services/adminService';

// 强制动态渲染
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // 认证检查
  const authResult = await authMiddleware(request);
  if (authResult.status !== 200) return authResult;
  
  const user = (request as any).user;
  
  // 权限检查 - 只有管理员可以访问
  if (user.role !== 'admin') {
    return NextResponse.json(
      { error: '权限不足' },
      { status: 403 }
    );
  }
  
  try {
    const stats = await AdminService.getSystemStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('获取系统统计失败:', error);
    return NextResponse.json(
      { error: '获取系统统计失败' },
      { status: 500 }
    );
  }
} 