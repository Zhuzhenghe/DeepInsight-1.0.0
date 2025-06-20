'use client';

import React, { useEffect } from 'react';
import { useTranslations } from '@/lib/i18n';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslations();

  // 动态设置页面标题 - 注意这里会被子页面覆盖
  useEffect(() => {
    // 只在没有更具体的标题时设置默认标题
    if (!document.title.includes(' - ')) {
      document.title = t('meta.libraryTitle');
    }
  }, [t]);

  return <div>{children}</div>;
};

export default Layout;
