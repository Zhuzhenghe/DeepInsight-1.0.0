import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/userService';
import { extractToken } from '@/lib/auth/jwt';

// 强制动态渲染
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 从请求头中提取 token
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      );
    }
    
    // 执行登出
    await UserService.logout(token);
    
    return NextResponse.json({
      message: '登出成功',
    });
  } catch (error) {
    console.error('登出错误:', error);
    return NextResponse.json(
      { error: '登出失败' },
      { status: 500 }
    );
  }
} 