'use client';

import { Search, TrendingUp, Clock, MessageCircle, Settings, ArrowLeft, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiGet } from '@/lib/api/client';
import Image from 'next/image';
import { useTranslations } from '@/lib/i18n';

interface Discover {
  title: string;
  content: string;
  url: string;
  thumbnail: string;
}

const Page = () => {
  const [discover, setDiscover] = useState<Discover[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const { t } = useTranslations();

  // 设置页面标题
  useEffect(() => {
    document.title = t('meta.discoverTitle');
  }, [t]);

  const fetchData = async () => {
    try {
      // 在API请求中加入当前语言设置
      const res = await fetch(`/api/discover?lang=${encodeURIComponent(t('common.locale') || 'zh')}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch data');
      }

              if (data.blogs && Array.isArray(data.blogs)) {
          // 过滤掉没有缩略图的文章，并验证缩略图URL
          const filteredBlogs = data.blogs.filter((blog: Discover) => {
            if (!blog.thumbnail) return false;
            
            try {
              // 验证缩略图URL是否有效
              new URL(blog.thumbnail);
              return true;
            } catch (error) {
              console.warn('Invalid thumbnail URL:', blog.thumbnail);
              return false;
            }
          });
          setDiscover(filteredBlogs);
        
        if (filteredBlogs.length === 0) {
          setError(t('discover.noTrendingMessage'));
        }
      } else {
        setError(t('errors.somethingWentWrong'));
      }
    } catch (err: any) {
      console.error('Error fetching data:', err.message);
      
      // 根据错误类型设置不同的错误信息
      if (err.message.includes('SearXNG')) {
        setError(t('discover.noContentMessage'));
              } else if (err.message.includes('Network')) {
          setError(t('errors.networkError'));
        } else {
          setError(t('errors.somethingWentWrong'));
        }
      
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await apiGet(`/api/discover?lang=${encodeURIComponent(t('common.locale') || 'zh')}`);
        
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    };

    fetchSuggestions();
  }, []);

  // 加载状态
  if (loading) {
    return (
      <div className="flex flex-row items-center justify-center min-h-screen">
        <svg
          aria-hidden="true"
          className="w-8 h-8 text-light-200 fill-light-secondary dark:text-[#202020] animate-spin dark:fill-[#ffffff3b]"
          viewBox="0 0 100 101"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M100 50.5908C100.003 78.2051 78.1951 100.003 50.5908 100C22.9765 99.9972 0.997224 78.018 1 50.4037C1.00281 22.7993 22.8108 0.997224 50.4251 1C78.0395 1.00281 100.018 22.8108 100 50.4251ZM9.08164 50.594C9.06312 73.3997 27.7909 92.1272 50.5966 92.1457C73.4023 92.1642 92.1298 73.4365 92.1483 50.6308C92.1669 27.8251 73.4392 9.0973 50.6335 9.07878C27.8278 9.06026 9.10003 27.787 9.08164 50.594Z"
            fill="currentColor"
          />
          <path
            d="M93.9676 39.0409C96.393 38.4037 97.8624 35.9116 96.9801 33.5533C95.1945 28.8227 92.871 24.3692 90.0681 20.348C85.6237 14.1775 79.4473 9.36872 72.0454 6.45794C64.6435 3.54717 56.3134 2.65431 48.3133 3.89319C45.869 4.27179 44.3768 6.77534 45.014 9.20079C45.6512 11.6262 48.1343 13.0956 50.5786 12.717C56.5073 11.8281 62.5542 12.5399 68.0406 14.7911C73.527 17.0422 78.2187 20.7487 81.5841 25.4923C83.7976 28.5886 85.4467 32.059 86.4416 35.7474C87.1273 38.1189 89.5423 39.6781 91.9676 39.0409Z"
            fill="currentFill"
          />
        </svg>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col pt-4">
        <div className="flex items-center">
          <Search />
          <h1 className="text-3xl font-medium p-2">{t('common.discover')}</h1>
        </div>
        <hr className="border-t border-[#2B2C2C] my-4 w-full" />
      </div>

      {/* 错误状态 */}
      {error && (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <AlertCircle size={48} className="text-yellow-500" />
          <div className="text-center">
            <h3 className="text-lg font-medium text-black dark:text-white mb-2">
              {t('discover.noContent')}
            </h3>
            <p className="text-black/70 dark:text-white/70 text-sm mb-4 max-w-md">
              {error}
            </p>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                fetchData();
              }}
              className="px-4 py-2 bg-[#24A0ED] text-white rounded-lg hover:bg-[#1e8fd7] transition-colors"
            >
              {t('discover.reload')}
            </button>
          </div>
        </div>
      )}

      {/* 内容显示 */}
      {!error && (
        <div className="grid lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-4 pb-28 lg:pb-8 w-full justify-items-center lg:justify-items-start">
          {discover && discover.length > 0 ? (
            discover.map((item, i) => (
              <Link
                href={`/?q=Summary: ${item.url}`}
                key={i}
                className="max-w-sm rounded-lg overflow-hidden bg-light-secondary dark:bg-dark-secondary hover:-translate-y-[1px] transition duration-200"
                target="_blank"
              >
                <Image
                  className="object-cover w-full aspect-video"
                  src={item.thumbnail}
                  alt={item.title}
                  width={400}
                  height={225}
                  unoptimized
                  onError={(e) => {
                    console.warn('Failed to load image:', item.thumbnail);
                    // 设置默认占位图片
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyNSIgdmlld0JveD0iMCAwIDQwMCAyMjUiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjI1IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNzUgMTEyLjVMMjAwIDEzN0wyMjUgMTEyLjVNMjAwIDg3LjVWMTM3IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTcwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2QjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkltYWdlIFVuYXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4K';
                  }}
                />
                <div className="px-6 py-4">
                  <div className="font-bold text-lg mb-2">
                    {item.title.slice(0, 100)}...
                  </div>
                  <p className="text-black-70 dark:text-white/70 text-sm">
                    {item.content.slice(0, 100)}...
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center min-h-[300px] space-y-4">
              <TrendingUp size={48} className="text-gray-400" />
                             <div className="text-center">
                 <h3 className="text-lg font-medium text-black dark:text-white mb-2">
                   {t('discover.noTrendingContent')}
                 </h3>
                 <p className="text-black/70 dark:text-white/70 text-sm">
                   {t('discover.noTrendingMessage')}
                 </p>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Page;
