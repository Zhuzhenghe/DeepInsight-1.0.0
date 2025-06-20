'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Users, Database, Activity, TrendingUp, Shield, PieChart, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { useTranslations } from '@/lib/i18n';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalTokensUsed: number;
  totalChats: number;
  totalMessages: number;
  averageTokensPerUser: number;
  usersByRole: {
    free: number;
    pro: number;
    admin: number;
  };
  dailyStats: Array<{
    date: string;
    users: number;
    tokens: number;
    chats: number;
  }>;
  topModels: Array<{
    model: string;
    usage: number;
    percentage: number;
  }>;
}

const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  change,
  color = 'blue' 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number;
  change?: string;
  color?: string;
}) => {
  const colorClass = {
    blue: 'text-blue-500 bg-blue-500/10',
    green: 'text-green-500 bg-green-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    orange: 'text-orange-500 bg-orange-500/10',
  }[color] || 'text-blue-500 bg-blue-500/10';

  return (
    <div className="p-4 bg-light-secondary dark:bg-dark-secondary rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        {change && (
          <span className={`text-xs ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-black/90 dark:text-white/90">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-sm text-black/60 dark:text-white/60 mt-1">{label}</p>
    </div>
  );
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

export default function AdminDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useTranslations();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // 设置页面标题
  useEffect(() => {
    document.title = t('meta.adminTitle');
  }, [t]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && user.role !== 'admin') {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      const fetchStats = async () => {
        try {
          const response = await apiGet('/api/admin/stats');
          
          if (response.ok) {
            const data = await response.json();
            setStats(data);
          }
        } catch (error) {
          console.error('Failed to fetch admin stats:', error);
        } finally {
          setStatsLoading(false);
        }
      };

      fetchStats();
    }
  }, [user]);

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/20"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col pt-4">
        <div className="flex items-center space-x-2">
          <Link href="/" className="lg:hidden">
            <ArrowLeft className="text-black/70 dark:text-white/70" />
          </Link>
          <div className="flex flex-row space-x-0.5 items-center">
            <Shield size={23} />
            <h1 className="text-3xl font-medium p-2">{t('admin.dashboard')}</h1>
          </div>
        </div>
        <hr className="border-t border-[#2B2C2C] my-4 w-full" />
      </div>

      {statsLoading ? (
        <div className="flex flex-row items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-black/70 dark:text-white/70" />
        </div>
      ) : stats ? (
        <div className="flex flex-col space-y-6 pb-28 lg:pb-8">
          {/* 概览卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              label={t('admin.totalUsers')}
              value={stats.totalUsers}
              color="blue"
            />
            <StatCard
              icon={Activity}
              label={t('admin.activeUsers')}
              value={stats.activeUsers}
              color="green"
            />
            <StatCard
              icon={Database}
              label={t('admin.totalTokens')}
              value={stats.totalTokensUsed}
              color="purple"
            />
            <StatCard
              icon={TrendingUp}
              label={t('admin.avgUsage')}
              value={Math.round(stats.averageTokensPerUser)}
              color="orange"
            />
          </div>

          {/* 用户分布 */}
          <SettingsSection title={t('admin.userDistribution')}>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-light-secondary dark:bg-dark-secondary rounded-lg text-center">
                <p className="text-2xl font-bold text-black/90 dark:text-white/90">
                  {stats.usersByRole.free}
                </p>
                <p className="text-sm text-black/60 dark:text-white/60">{t('admin.freeUsers')}</p>
              </div>
              <div className="p-3 bg-light-secondary dark:bg-dark-secondary rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-500">
                  {stats.usersByRole.pro}
                </p>
                <p className="text-sm text-black/60 dark:text-white/60">{t('admin.proUsers')}</p>
              </div>
              <div className="p-3 bg-light-secondary dark:bg-dark-secondary rounded-lg text-center">
                <p className="text-2xl font-bold text-purple-500">
                  {stats.usersByRole.admin}
                </p>
                <p className="text-sm text-black/60 dark:text-white/60">{t('admin.adminUsers')}</p>
              </div>
            </div>
          </SettingsSection>

          {/* 热门模型 */}
          <SettingsSection title={t('admin.topModels')}>
            <div className="space-y-3">
              {stats.topModels.map((model, index) => (
                <div key={model.model} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-black/60 dark:text-white/60 w-6">
                      #{index + 1}
                    </span>
                    <span className="text-sm text-black/90 dark:text-white/90">
                      {model.model}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-light-200 dark:bg-dark-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${model.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-black/60 dark:text-white/60 w-20 text-right">
                      {model.usage.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SettingsSection>

          {/* 最近7天趋势 */}
          <SettingsSection title={t('admin.recentActivity')}>
            <div className="space-y-2">
              {stats.dailyStats.map((day) => (
                <div key={day.date} className="p-3 bg-light-secondary dark:bg-dark-secondary rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-black/90 dark:text-white/90">
                      {new Date(day.date).toLocaleDateString('zh-CN', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                    <div className="flex items-center space-x-4 text-xs">
                      <span className="text-black/60 dark:text-white/60">
                        👤 {day.users}
                      </span>
                      <span className="text-black/60 dark:text-white/60">
                        💬 {day.chats}
                      </span>
                      <span className="text-black/60 dark:text-white/60">
                        🔤 {day.tokens.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SettingsSection>

          {/* 快捷操作 */}
          <SettingsSection title={t('admin.quickActions')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Link
                href="/admin/users"
                className="flex items-center justify-between p-3 bg-light-secondary dark:bg-dark-secondary rounded-lg hover:bg-light-200 dark:hover:bg-dark-200 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-black/70 dark:text-white/70" />
                  <span className="text-sm text-black/90 dark:text-white/90">{t('admin.userManagement')}</span>
                </div>
                <ArrowLeft className="w-4 h-4 text-black/50 dark:text-white/50 rotate-180" />
              </Link>
              
              <Link
                href="/settings"
                className="flex items-center justify-between p-3 bg-light-secondary dark:bg-dark-secondary rounded-lg hover:bg-light-200 dark:hover:bg-dark-200 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <PieChart className="w-5 h-5 text-black/70 dark:text-white/70" />
                  <span className="text-sm text-black/90 dark:text-white/90">{t('admin.systemSettings')}</span>
                </div>
                <ArrowLeft className="w-4 h-4 text-black/50 dark:text-white/50 rotate-180" />
              </Link>
            </div>
          </SettingsSection>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-black/60 dark:text-white/60">{t('admin.loadStatsFailed')}</p>
        </div>
      )}
    </div>
  );
} 