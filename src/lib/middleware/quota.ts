import { NextRequest, NextResponse } from 'next/server';
import { UsageService } from '@/lib/services/usageService';
import { User } from '@/lib/db/schema';

export async function quotaMiddleware(request: NextRequest) {
  try {
    // 获取用户信息（由认证中间件设置）
    const user = (request as any).user as User;
    
    if (!user) {
      return NextResponse.json(
        { error: '未认证用户' },
        { status: 401 }
      );
    }
    
    // 检查配额
    const quotaCheck = await UsageService.checkQuota(user.id);
    
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        { 
          error: quotaCheck.reason || '配额不足',
          code: 'QUOTA_EXCEEDED'
        },
        { status: 429 }
      );
    }
    
    return NextResponse.next();
  } catch (error) {
    console.error('配额检查错误:', error);
    return NextResponse.json(
      { error: '配额检查失败' },
      { status: 500 }
    );
  }
}

// 预估 Token 数量的中间件
export function estimateTokens(text: string): number {
  // 简单的估算：平均每个字符约 0.25 个 token（英文）
  // 中文字符约 2 个 token
  let tokenCount = 0;
  
  for (const char of text) {
    if (/[\u4e00-\u9fa5]/.test(char)) {
      // 中文字符
      tokenCount += 2;
    } else if (/[a-zA-Z0-9]/.test(char)) {
      // 英文字母和数字
      tokenCount += 0.25;
    } else {
      // 其他字符（标点等）
      tokenCount += 0.5;
    }
  }
  
  return Math.ceil(tokenCount);
}

// 高级配额中间件：支持预估 token 数量
export function createQuotaMiddleware(estimatedTokens?: number) {
  return async (request: NextRequest) => {
    try {
      const user = (request as any).user as User;
      
      if (!user) {
        return NextResponse.json(
          { error: '未认证用户' },
          { status: 401 }
        );
      }
      
      // 如果提供了预估的 token 数量，检查是否足够
      const quotaCheck = await UsageService.checkQuota(
        user.id, 
        estimatedTokens || 0
      );
      
      if (!quotaCheck.allowed) {
        // 获取用户当前使用情况
        const stats = await UsageService.getUserUsageStats(user.id);
        
        return NextResponse.json(
          { 
            error: quotaCheck.reason || '配额不足',
            code: 'QUOTA_EXCEEDED',
            usage: {
              dailyUsed: stats.dailyUsed,
              dailyLimit: stats.dailyLimit,
              monthlyUsed: stats.monthlyUsed,
              monthlyLimit: stats.monthlyLimit,
            }
          },
          { status: 429 }
        );
      }
      
      return NextResponse.next();
    } catch (error) {
      console.error('配额检查错误:', error);
      return NextResponse.json(
        { error: '配额检查失败' },
        { status: 500 }
      );
    }
  };
} 