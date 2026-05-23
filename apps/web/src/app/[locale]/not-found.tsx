'use client';
import { useRouter } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';

import InteractiveErrorState from '@auibsal/ui/components/InteractiveErrorState';

export default function WebNotFound() {
  const t = useTranslations('NotFound');
  const locale = useLocale();
  const router = useRouter();

  return (
    <InteractiveErrorState
      code="404_VOID"
      title={t('title')}
      message={t('description')}
      actionText={t('returnHome')}
      onAction={() => router.push('/')}
      isRtl={locale === 'ar'}
    />
  );
}
