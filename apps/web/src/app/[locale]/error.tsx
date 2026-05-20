'use client';

import { useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { InteractiveErrorState } from '@auibsal/ui';

export default function WebError({ 
  error, 
  reset 
}: { 
  error: Error & { digest?: string }; 
  reset: () => void;
}) {
  const t = useTranslations('Error');
  const locale = useLocale();

  useEffect(() => {
    // The digest can be logged here for precise Vercel/Sentry debugging
    console.error('Runtime Error:', error, 'Digest:', error.digest);
  }, [error]);

  return (
    <InteractiveErrorState 
      code="500_FATAL"
      title={t('title')}
      message={t('description')}
      actionText={t('reconstruct')}
      onAction={() => reset()}
      isRtl={locale === 'ar'}
    />
  );
}
