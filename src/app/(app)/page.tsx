'use client';

import ChatWindow from '@/components/ChatWindow';
import { Suspense, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n';

const Home = () => {
  const { t } = useTranslations();

  // 动态设置页面标题
  useEffect(() => {
    document.title = t('meta.chatTitle');
  }, [t]);

  return (
    <div>
      <Suspense>
        <ChatWindow />
      </Suspense>
    </div>
  );
};

export default Home;
