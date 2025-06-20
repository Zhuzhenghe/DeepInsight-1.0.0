'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, User, Mail, Shield, Calendar, Clock, Database, Activity, LogOut, FileText, Image, Video, Search } from 'lucide-react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { useTranslations } from '@/lib/i18n';

interface UsageStats {
  dailyUsed: number;
  monthlyUsed: number;
  dailyLimit: number;
  monthlyLimit: number;
  isUnlimited: boolean;
}

interface UsageSummary {
  dailyUsage: Record<string, number>;
  modelUsage: Record<string, number>;
  typeUsage: Record<string, number>;
  totalTokens: number;
  totalCost: number;
  recordCount: number;
}

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

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [history, setHistory] = useState<TokenUsageRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const { t } = useTranslations();

  useEffect(() => {
    // 设置页面标题
    document.title = t('meta.profileTitle');
    
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router, t]);

  useEffect(() => {
    const fetchUsageStats = async () => {
      try {
        setStatsLoading(true);
        const response = await apiGet('/api/usage/stats');
        
        if (response.ok) {
          const data = await response.json();
          setUsageStats(data.current);
          setUsageSummary(data.summary);
        } else {
          console.error('Failed to fetch usage stats:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Failed to fetch usage stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        const response = await apiGet('/api/usage/history?limit=5&offset=0');
        
        if (response.ok) {
          const data = await response.json();
          setHistory(data.history || []);
        } else {
          console.error('Failed to fetch usage history:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Failed to fetch usage history:', error);
      } finally {
        setHistoryLoading(false);
      }
    };

    if (user) {
      fetchUsageStats();
      fetchHistory();
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/20"></div>
      </div>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('profile.unknown');
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatRelativeTime = (dateString: string) => {
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4 text-purple-500" />;
      case 'pro':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return t('profile.admin');
      case 'pro':
        return t('profile.proUser');
      default:
        return t('profile.freeUser');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-col pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href="/" className="lg:hidden">
              <ArrowLeft className="text-black/70 dark:text-white/70" />
            </Link>
            <div className="flex flex-row space-x-0.5 items-center">
              <User size={23} />
              <h1 className="text-3xl font-medium p-2">{t('common.profile')}</h1>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">{t('profile.logout')}</span>
          </button>
        </div>
        <hr className="border-t border-[#2B2C2C] my-4 w-full" />
      </div>

      <div className="flex flex-col space-y-6 pb-28 lg:pb-8">
        <SettingsSection title={t('profile.accountInfo')}>
          <div className="flex flex-col space-y-4">
            {/* 用户头像和基本信息 */}
            <div className="flex items-center space-x-4 p-3 bg-light-secondary dark:bg-dark-secondary rounded-lg">
              <div className="w-16 h-16 bg-[#24A0ED] rounded-full flex items-center justify-center text-white text-2xl font-medium">
                {user.username[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-medium text-black/90 dark:text-white/90">
                    {user.username}
                  </h3>
                  <div className="flex items-center space-x-1 px-2 py-0.5 bg-light-200 dark:bg-dark-200 rounded-full">
                    {getRoleIcon(user.role)}
                    <span className="text-xs text-black/70 dark:text-white/70">
                      {getRoleLabel(user.role)}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-black/60 dark:text-white/60 mt-1">
                  {user.email}
                </p>
              </div>
            </div>

            {/* 详细信息 */}
            <div className="grid grid-cols-1 gap-3">
              <div className="p-3 bg-light-secondary dark:bg-dark-secondary rounded-lg">
                <p className="text-xs text-black/60 dark:text-white/60 mb-1">
                  {t('profile.userId')}
                </p>
                <p className="text-sm text-black/90 dark:text-white/90 font-mono">
                  {user.id}
                </p>
              </div>
              
              <div className="p-3 bg-light-secondary dark:bg-dark-secondary rounded-lg">
                <p className="text-xs text-black/60 dark:text-white/60 mb-1">
                  {t('profile.registrationTime')}
                </p>
                <p className="text-sm text-black/90 dark:text-white/90">
                  {formatDate(user.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title={t('profile.usageAndLimits')}>
          {statsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-light-200 dark:border-dark-200"></div>
            </div>
          ) : usageStats ? (
            <div className="flex flex-col space-y-4">
              {!usageStats.isUnlimited ? (
                <>
                  <div className="p-3 bg-light-secondary dark:bg-dark-secondary rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-black/90 dark:text-white/90">
                        {t('profile.dailyLimit')}
                      </p>
                      <p className="text-sm text-black/60 dark:text-white/60">
                        {usageStats.dailyUsed.toLocaleString()} / {usageStats.dailyLimit.toLocaleString()} tokens
                      </p>
                    </div>
                    <div className="w-full bg-light-200 dark:bg-dark-200 rounded-full h-2">
                      <div 
                        className="bg-[#24A0ED] h-2 rounded-full transition-all" 
                        style={{ width: `${Math.min((usageStats.dailyUsed / usageStats.dailyLimit) * 100, 100)}%` }} 
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-light-secondary dark:bg-dark-secondary rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-black/90 dark:text-white/90">
                        {t('profile.monthlyLimit')}
                      </p>
                      <p className="text-sm text-black/60 dark:text-white/60">
                        {usageStats.monthlyUsed.toLocaleString()} / {usageStats.monthlyLimit.toLocaleString()} tokens
                      </p>
                    </div>
                    <div className="w-full bg-light-200 dark:bg-dark-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full transition-all" 
                        style={{ width: `${Math.min((usageStats.monthlyUsed / usageStats.monthlyLimit) * 100, 100)}%` }} 
                      />
                    </div>
                  </div>

                  {user.role === 'free' && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center space-x-2 mb-2">
                        <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          {t('profile.upgradeToProTitle')}
                        </p>
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        {t('profile.upgradeToProDescription')}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-3 bg-light-secondary dark:bg-dark-secondary rounded-lg">
                  <div className="flex items-center space-x-2">
                    {user.role === 'admin' ? (
                      <Shield className="w-5 h-5 text-purple-500" />
                    ) : (
                      <Shield className="w-5 h-5 text-blue-500" />
                    )}
                    <div>
                      <p className="text-sm text-black/90 dark:text-white/90 font-medium">
                        {t('profile.unlimitedUsage')}
                      </p>
                      <p className="text-xs text-black/60 dark:text-white/60 mt-0.5">
                        {t('profile.upgradeToProMessage')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 使用统计 */}
              {usageSummary && usageSummary.recordCount > 0 && (
                <div className="p-3 bg-light-secondary dark:bg-dark-secondary rounded-lg">
                  <p className="text-sm text-black/90 dark:text-white/90 font-medium mb-3">
                    {t('profile.last7DaysStats')}
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-black/60 dark:text-white/60">{t('profile.totalTokens')}</p>
                      <p className="text-black/90 dark:text-white/90 font-medium">
                        {usageSummary.totalTokens.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-black/60 dark:text-white/60">{t('profile.usageCount')}</p>
                      <p className="text-black/90 dark:text-white/90 font-medium">
                        {usageSummary.recordCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-black/60 dark:text-white/60">{t('profile.estimatedCost')}</p>
                      <p className="text-black/90 dark:text-white/90 font-medium">
                        ${usageSummary.totalCost.toFixed(4)}
                      </p>
                    </div>
                    <div>
                      <p className="text-black/60 dark:text-white/60">{t('profile.primaryModel')}</p>
                      <p className="text-black/90 dark:text-white/90 font-medium">
                        {Object.keys(usageSummary.modelUsage)[0] || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-black/60 dark:text-white/60 text-sm py-4">{t('profile.noUsageData')}</p>
          )}
        </SettingsSection>

        {/* 最近使用记录 */}
        <SettingsSection title={t('profile.recentUsage')}>
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-light-200 dark:border-dark-200"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <Database className="w-10 h-10 text-black/30 dark:text-white/30 mx-auto mb-3" />
              <p className="text-black/60 dark:text-white/60 text-sm">{t('profile.noUsageHistory')}</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {history.slice(0, showAllHistory ? undefined : 5).map((record) => (
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
                              {formatRelativeTime(record.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-black/90 dark:text-white/90 font-medium">
                          {record.tokensUsed.toLocaleString()}
                        </p>
                        <p className="text-xs text-black/50 dark:text-white/50">tokens</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {history.length > 5 && (
                <button
                  onClick={() => setShowAllHistory(!showAllHistory)}
                  className="w-full py-2 text-sm text-black/70 dark:text-white/70 hover:text-black/90 dark:hover:text-white/90 transition-colors"
                >
                  {showAllHistory ? t('profile.collapse') : t('profile.viewMore')}
                </button>
              )}
              
              <Link 
                href="/usage/history"
                className="flex items-center justify-between p-3 bg-light-secondary dark:bg-dark-secondary rounded-lg hover:bg-light-200 dark:hover:bg-dark-200 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Activity className="w-5 h-5 text-black/70 dark:text-white/70" />
                  <span className="text-sm text-black/90 dark:text-white/90">{t('profile.viewFullHistory')}</span>
                </div>
                <ArrowLeft className="w-4 h-4 text-black/50 dark:text-white/50 rotate-180" />
              </Link>
            </>
          )}
        </SettingsSection>
      </div>
    </div>
  );
} 