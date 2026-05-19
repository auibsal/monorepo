'use client';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { InteractiveErrorState } from '@auibsal/ui';

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
