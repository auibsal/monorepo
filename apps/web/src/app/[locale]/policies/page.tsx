import { useTranslations } from 'next-intl';

export default function PoliciesPage() {
  const t = useTranslations('PoliciesPage');

  return (
    <div className="container mx-auto px-4 py-12 text-start">
      <h1 className="text-4xl font-bold mb-6 text-primary">{t('title')}</h1>
      <div className="prose dark:prose-invert max-w-none text-start">
        <p className="text-lg leading-relaxed mb-4">{t('p1')}</p>
        <p className="text-lg leading-relaxed mb-4">{t('p2')}</p>
      </div>
    </div>
  );
}
