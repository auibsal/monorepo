'use client';

import { useEffect } from 'react';

import { useLocale, useTranslations } from 'next-intl';

// 1. Synchronized with the named export standard of the UI package
import { InteractiveErrorState } from '@auibsal/ui/components/InteractiveErrorState';

export default function WebError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // 2. Maps to the newly added "Error" blocks in your JSON dictionaries
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
