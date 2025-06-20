import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware/auth';
import { AdminService } from '@/lib/services/adminService';

// 强制动态渲染
export const dynamic = 'force-dynamic';

// 获取用户详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 认证检查
  const authResult = await authMiddleware(request);
  if (authResult.status !== 200) return authResult;
  
  const user = (request as any).user;
  
  // 权限检查
  if (user.role !== 'admin') {
    return NextResponse.json(
      { error: '权限不足' },
      { status: 403 }
    );
  }
  
  try {
    const { id } = await params;
    const result = await AdminService.getUserDetail(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('获取用户详情失败:', error);
    return NextResponse.json(
      { error: '获取用户详情失败' },
      { status: 500 }
    );
  }
}

// 更新用户信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 认证检查
  const authResult = await authMiddleware(request);
  if (authResult.status !== 200) return authResult;
  
  const user = (request as any).user;
  
  // 权限检查
  if (user.role !== 'admin') {
    return NextResponse.json(
      { error: '权限不足' },
      { status: 403 }
    );
  }
  
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await AdminService.updateUser(id, body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('更新用户信息失败:', error);
    return NextResponse.json(
      { error: '更新用户信息失败' },
      { status: 500 }
    );
  }
}

// 删除用户（软删除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 认证检查
  const authResult = await authMiddleware(request);
  if (authResult.status !== 200) return authResult;
  
  const user = (request as any).user;
  
  // 权限检查
  if (user.role !== 'admin') {
    return NextResponse.json(
      { error: '权限不足' },
      { status: 403 }
    );
  }
  
  try {
    const { id } = await params;
    
    // 防止删除自己
    if (user.id === id) {
      return NextResponse.json(
        { error: '不能删除自己的账号' },
        { status: 400 }
      );
    }
    
    const result = await AdminService.deleteUser(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('删除用户失败:', error);
    return NextResponse.json(
      { error: '删除用户失败' },
      { status: 500 }
    );
  }
} 