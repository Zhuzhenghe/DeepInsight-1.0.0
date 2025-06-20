import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/auth/jwt';
import { UserService } from '@/lib/services/userService';
import { User } from '@/lib/db/schema';

export interface AuthenticatedRequest extends NextRequest {
  user?: User;
}

export async function authMiddleware(request: NextRequest) {
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
    
    // 验证 token
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      );
    }
    
    // 验证会话并获取用户信息
    const user = await UserService.validateSession(token);
    if (!user) {
      return NextResponse.json(
        { error: '会话已过期，请重新登录' },
        { status: 401 }
      );
    }
    
    // 将用户信息附加到请求对象
    (request as any).user = user;
    
    return NextResponse.next();
  } catch (error) {
    console.error('认证错误:', error);
    return NextResponse.json(
      { error: '认证失败' },
      { status: 401 }
    );
  }
}

// 角色权限检查
export function requireRole(roles: string[]) {
  return async (request: NextRequest) => {
    const user = (request as any).user;
    
    if (!user || !roles.includes(user.role)) {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      );
    }
    
    return NextResponse.next();
  };
}

// 可选认证中间件（不强制要求登录）
export async function optionalAuthMiddleware(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractToken(authHeader);
    
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        const user = await UserService.validateSession(token);
        if (user) {
          (request as any).user = user;
        }
      }
    }
    
    return NextResponse.next();
  } catch (error) {
    // 忽略错误，继续处理请求
    return NextResponse.next();
  }
} 