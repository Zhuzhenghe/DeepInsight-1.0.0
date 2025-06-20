'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiPost } from '@/lib/api/client';
import { useTranslations } from '@/lib/i18n';

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  // 设置页面标题
  useEffect(() => {
    document.title = t('meta.registerTitle');
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证密码匹配
    if (formData.password !== formData.confirmPassword) {
      toast.error(t('auth.passwordMismatch'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiPost('/api/auth/register', formData, { skipAuth: true });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('errors.somethingWentWrong'));
      }

      // 保存 token 到 localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      toast.success(t('auth.registerSuccess'));
      
      // 跳转到首页
      router.push('/');
    } catch (error: any) {
      toast.error(error.message || t('errors.somethingWentWrong'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-light-100 dark:bg-dark-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-dark-200 rounded-lg shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold text-black dark:text-white">
            {t('auth.registerTitle')}
          </h2>
          <p className="mt-2 text-center text-sm text-black-70 dark:text-white/70">
            {t('auth.orLogin')}{' '}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              {t('auth.login')}
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-black dark:text-white">
                {t('auth.emailAddress')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-dark-100 text-black dark:text-white"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-black dark:text-white">
                {t('auth.username')}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                pattern="^[a-zA-Z0-9_]+$"
                title={t('auth.usernameHelp')}
                minLength={3}
                maxLength={20}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-dark-100 text-black dark:text-white"
                placeholder="username"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('auth.usernameRules')}
              </p>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-black dark:text-white">
                {t('auth.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-dark-100 text-black dark:text-white"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('auth.passwordMinLength')}
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-black dark:text-white">
                {t('auth.confirmPassword')}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-dark-100 text-black dark:text-white"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? t('auth.registering') : t('auth.register')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 