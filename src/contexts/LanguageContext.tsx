'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Locale, locales, defaultLocale } from '@/i18n/request';

// 静态导入所有消息文件
import enMessages from '@/messages/en.json';
import zhMessages from '@/messages/zh.json';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: any;
  setMessages: (messages: any) => void;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// 消息映射
const messagesMap = {
  en: enMessages,
  zh: zhMessages,
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState<any>(messagesMap[defaultLocale]);
  const [isLoading, setIsLoading] = useState(false);

  // 从localStorage获取保存的语言设置
  useEffect(() => {
    const savedLocale = localStorage.getItem('language') as Locale;
    if (savedLocale && locales.includes(savedLocale)) {
      setLocaleState(savedLocale);
    }
  }, []);

  // 当语言改变时更新消息
  useEffect(() => {
    setIsLoading(true);
    try {
      const newMessages = messagesMap[locale] || messagesMap[defaultLocale];
      setMessages(newMessages);
    } catch (error) {
      console.error(`Failed to load messages for locale ${locale}:`, error);
      // 如果加载失败，回退到默认语言
      setMessages(messagesMap[defaultLocale]);
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('language', newLocale);
    // 更新页面标题语言
    document.documentElement.lang = newLocale;
  };

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        messages,
        setMessages,
        isLoading,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}; 