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
    const { searchParams } = new URL(request.url);
    
    const options = {
      limit: parseInt(searchParams.get('limit') || '20', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
      search: searchParams.get('search') || undefined,
      role: searchParams.get('role') || undefined,
      sortBy: searchParams.get('sortBy') as any || 'createdAt',
      sortOrder: searchParams.get('sortOrder') as any || 'desc',
    };
    
    const result = await AdminService.getUsers(options);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json(
      { error: '获取用户列表失败' },
      { status: 500 }
    );
  }
} 