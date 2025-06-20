'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Clock, Database, FileText, Image, Video, Search, Activity } from 'lucide-react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { useTranslations } from '@/lib/i18n';

interface TokenUsageRecord {
  id: string;
  userId: string;
  tokensUsed: number;
  modelName: string;
  usageType: 'chat' | 'search' | 'image' | 'video';
  createdAt: string;
  requestId?: string;
  cost?: number;
}

const UsageTypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'chat':
      return <FileText className="w-4 h-4 text-blue-500" />;
    case 'search':
      return <Search className="w-4 h-4 text-green-500" />;
    case 'image':
      return <Image className="w-4 h-4 text-purple-500" />;
    case 'video':
      return <Video className="w-4 h-4 text-red-500" />;
    default:
      return <Database className="w-4 h-4 text-gray-500" />;
  }
};

const UsageTypeLabel = ({ type, t }: { type: string; t: any }) => {
  const labels = {
    chat: t('chat.chat'),
    search: t('chat.search'),
    image: t('chat.image'),
    video: t('chat.video')
  };
  return labels[type as keyof typeof labels] || type;
};

const SettingsSection = ({ 
  title, 
  children 
}: { 
  title: string; 
  children: React.ReactNode;
}) => (
  <div className="flex flex-col space-y-4 p-4 bg-light-secondary/50 dark:bg-dark-secondary/50 rounded-xl border border-light-200 dark:border-dark-200">
    <h2 className="text-black/90 dark:text-white/90 font-medium">{title}</h2>
    {children}
  </div>
);

export default function UsageHistoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useTranslations();
  const [history, setHistory] = useState<TokenUsageRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  // 设置页面标题
  useEffect(() => {
    document.title = t('meta.usageHistoryTitle');
  }, [t]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const fetchHistory = useCallback(async (reset = false) => {
    if (!user) return;
    
    try {
      setHistoryLoading(true);
      const currentOffset = reset ? 0 : offset;
      const response = await apiGet(`/api/usage/history?limit=${limit}&offset=${currentOffset}`);
      
      if (response.ok) {
        const data = await response.json();
        if (reset) {
          setHistory(data.records || []);
          setOffset(limit);
        } else {
          setHistory(prev => [...prev, ...(data.records || [])]);
          setOffset(prev => prev + limit);
        }
        setHasMore((data.records || []).length === limit);
      }
    } catch (error) {
      console.error('Failed to fetch usage history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, [user, offset, limit]);

  useEffect(() => {
    if (user) {
      fetchHistory(true);
    }
  }, [user, fetchHistory]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/20"></div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes === 0 ? t('profile.justNow') : `${minutes} ${t('profile.minutesAgo')}`;
      }
      return `${hours} ${t('profile.hoursAgo')}`;
    } else if (days === 1) {
      return t('profile.yesterday');
    } else if (days < 7) {
      return `${days} ${t('profile.daysAgo')}`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-col pt-4">
        <div className="flex items-center space-x-2">
          <Link href="/profile" className="lg:hidden">
            <ArrowLeft className="text-black/70 dark:text-white/70" />
          </Link>
          <div className="flex flex-row space-x-0.5 items-center">
            <Activity size={23} />
            <h1 className="text-3xl font-medium p-2">{t('usage.title')}</h1>
          </div>
        </div>
        <hr className="border-t border-[#2B2C2C] my-4 w-full" />
      </div>

      <div className="flex flex-col space-y-6 pb-28 lg:pb-8">
        <SettingsSection title={t('usage.tokenUsageRecords')}>
          {historyLoading && history.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-light-200 dark:border-dark-200"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-black/30 dark:text-white/30 mx-auto mb-4" />
              <p className="text-black/60 dark:text-white/60">{t('profile.noUsageHistory')}</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {history.map((record) => (
                  <div 
                    key={record.id} 
                    className="p-3 bg-light-secondary dark:bg-dark-secondary rounded-lg hover:bg-light-200 dark:hover:bg-dark-200 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <UsageTypeIcon type={record.usageType} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-black/90 dark:text-white/90 font-medium">
                              <UsageTypeLabel type={record.usageType} t={t} />
                            </span>
                            <span className="text-xs text-black/60 dark:text-white/60">
                              • {record.modelName}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-black/50 dark:text-white/50">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(record.createdAt)}
                            </span>
                            {record.requestId && (
                              <span className="font-mono">
                                ID: {record.requestId.slice(0, 8)}...
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-black/90 dark:text-white/90 font-medium">
                          {record.tokensUsed.toLocaleString()} tokens
                        </p>
                        {record.cost !== undefined && record.cost > 0 && (
                          <p className="text-xs text-black/60 dark:text-white/60">
                            ${record.cost.toFixed(4)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Load More */}
              {hasMore && (
                <button
                  onClick={() => fetchHistory(false)}
                  disabled={historyLoading}
                  className="w-full py-2 px-4 text-sm text-black/70 dark:text-white/70 bg-light-secondary dark:bg-dark-secondary rounded-lg hover:bg-light-200 dark:hover:bg-dark-200 transition-colors disabled:opacity-50"
                >
                  {historyLoading ? t('usage.loading') : t('usage.loadMore')}
                </button>
              )}
            </>
          )}
        </SettingsSection>
      </div>
    </div>
  );
} 