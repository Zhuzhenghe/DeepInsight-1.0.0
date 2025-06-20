'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslations } from '@/lib/i18n';
import { locales, Locale } from '@/i18n/request';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { locale, setLocale } = useLanguage();
  const { t } = useTranslations();

  const handleLanguageChange = (newLocale: Locale) => {
    setLocale(newLocale);
  };

  return (
    <div className="flex items-center justify-between p-3 bg-light-secondary dark:bg-dark-secondary rounded-lg hover:bg-light-200 dark:hover:bg-dark-200 transition-colors">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-light-200 dark:bg-dark-200 rounded-lg">
          <Globe size={18} className="text-black/70 dark:text-white/70" />
        </div>
        <div>
          <p className="text-sm text-black/90 dark:text-white/90 font-medium">
            {t('common.language')}
          </p>
          <p className="text-xs text-black/60 dark:text-white/60 mt-0.5">
            {t('settings.selectLanguage')}
          </p>
        </div>
      </div>
      <select
        value={locale}
        onChange={(e) => handleLanguageChange(e.target.value as Locale)}
        className="bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-lg px-3 py-2 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#24A0ED] focus:border-transparent"
      >
        {locales.map((localeOption) => (
          <option key={localeOption} value={localeOption}>
            {t(`languages.${localeOption}`)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSwitcher; 