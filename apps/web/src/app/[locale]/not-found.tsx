'use client';

// 1. Synchronized with the named export standard of the UI package
import { InteractiveErrorState } from '@auibsal/ui/components/InteractiveErrorState';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';

export default function WebNotFound() {
  const t = useTranslations('NotFound');
  const locale = useLocale();
  const router = useRouter();

  return (
    <InteractiveErrorState
      // 2. Perfectly mapped to your established dictionary keys
      code={t('title')} // Translates to "404"
      title={t('heading')} // Translates to "Page Not Found" / "الصفحة غير موجودة"
      message={t('description')}
      actionText={t('returnHome')}
      onAction={() => router.push('/')}
      isRtl={locale === 'ar'}
    />
  );
}
