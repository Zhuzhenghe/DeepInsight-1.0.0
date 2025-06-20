import { useLanguage } from '@/contexts/LanguageContext';

// 静态导入消息文件
import enMessages from '@/messages/en.json';
import zhMessages from '@/messages/zh.json';

// 翻译函数的类型定义
export type TranslationKey = string;

// 嵌套对象的路径类型
export type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

// 消息映射
const messagesMap = {
  en: enMessages,
  zh: zhMessages,
};

// 获取嵌套对象的值
export function getNestedValue(obj: any, path: string, fallback: string = path): string {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj) || fallback;
}

// 自定义翻译hook
export function useTranslations() {
  const { messages, locale } = useLanguage();

  const t = (key: TranslationKey, params?: Record<string, any>): string => {
    let translation = getNestedValue(messages, key, key);
    
    // 处理参数替换
    if (params && typeof translation === 'string') {
      Object.keys(params).forEach(param => {
        translation = translation.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
      });
    }
    
    return translation;
  };

  return { t, locale };
}

// 服务端翻译函数
export async function getTranslations(locale: string) {
  try {
    const messages = messagesMap[locale as keyof typeof messagesMap] || messagesMap.en;
    
    const t = (key: TranslationKey, params?: Record<string, any>): string => {
      let translation = getNestedValue(messages, key, key);
      
      // 处理参数替换
      if (params && typeof translation === 'string') {
        Object.keys(params).forEach(param => {
          translation = translation.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
        });
      }
      
      return translation;
    };

    return { t, locale, messages };
  } catch (error) {
    console.error(`Failed to load translations for locale ${locale}:`, error);
    // 回退到英文
    const fallbackMessages = messagesMap.en;
    const t = (key: TranslationKey, params?: Record<string, any>): string => {
      let translation = getNestedValue(fallbackMessages, key, key);
      
      if (params && typeof translation === 'string') {
        Object.keys(params).forEach(param => {
          translation = translation.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
        });
      }
      
      return translation;
    };

    return { t, locale: 'en', messages: fallbackMessages };
  }
} 