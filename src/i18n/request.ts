import { getRequestConfig } from 'next-intl/server';

// 静态导入消息文件
import enMessages from '@/messages/en.json';

// 支持的语言
export const locales = ['en', 'zh'] as const;
export const defaultLocale = 'zh' as const;

export type Locale = typeof locales[number];

export default getRequestConfig(async () => {
  // 在服务端使用默认语言，客户端会通过Context处理动态切换
  const locale = defaultLocale;

  return {
    locale,
    messages: enMessages
  };
}); 