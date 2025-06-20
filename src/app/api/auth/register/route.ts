import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/userService';
import { validatePassword } from '@/lib/auth/password';
import { z } from 'zod';

// 强制动态渲染
export const dynamic = 'force-dynamic';

const registerSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(8, '密码至少8位'),
  username: z.string().min(3, '用户名至少3位').max(20, '用户名最多20位')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证输入
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const { email, password, username } = validation.data;
    
    // 验证密码强度
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }
    
    // 创建用户
    const user = await UserService.createUser({
      email,
      password,
      username,
    });
    
    // 自动登录
    const loginResult = await UserService.login(
      email,
      password,
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      request.headers.get('user-agent') || undefined
    );
    
    // 返回用户信息和 token
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      token: loginResult.token,
    });
  } catch (error: any) {
    console.error('注册错误:', error);
    
    // 处理特定错误
    if (error.message.includes('已被注册') || error.message.includes('已被使用')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
} 