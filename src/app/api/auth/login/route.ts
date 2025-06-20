import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/userService';
import { z } from 'zod';

// 强制动态渲染
export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(1, '请输入密码'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证输入
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const { email, password } = validation.data;
    
    // 用户登录
    const loginResult = await UserService.login(
      email,
      password,
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      request.headers.get('user-agent') || undefined
    );
    
    // 返回用户信息和 token
    return NextResponse.json({
      user: {
        id: loginResult.user.id,
        email: loginResult.user.email,
        username: loginResult.user.username,
        role: loginResult.user.role,
      },
      token: loginResult.token,
    });
  } catch (error: any) {
    console.error('登录错误:', error);
    
    // 处理特定错误
    if (error.message.includes('邮箱或密码错误') || error.message.includes('账号已被禁用')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
} 