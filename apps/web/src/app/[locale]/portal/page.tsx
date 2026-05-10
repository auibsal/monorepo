import { useTranslations } from 'next-intl';

export default function PortalPage() {
  const t = useTranslations('PortalPage');

  return (
    <div className="container mx-auto px-4 py-12 text-start">
      <h1 className="text-4xl font-bold mb-6 text-primary">{t('title')}</h1>
      <div className="bg-card text-card-foreground border border-border p-6 text-start mb-6">
        <h2 className="text-2xl font-semibold mb-4">{t('welcome')}</h2>
        <p className="mb-4">{t('submissionsText')}</p>
        <p>{t('eventsText')}</p>
      </div>
    </div>
  );
}
