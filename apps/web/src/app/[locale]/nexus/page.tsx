import { useTranslations } from 'next-intl';

export default function NexusIntroPage() {
  const t = useTranslations('NexusIntro');

  // We are redirecting to nexus locally or via sub-domain
  const nexusLoginUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3001/login' : 'http://nexus.auib.edu.iq/login';

  return (
    <div className="min-h-screen bg-auib-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full border-2 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] bg-white p-8 md:p-12 text-start">
        <h1 className="text-3xl md:text-5xl font-bold text-auib-charcoal mb-4 uppercase tracking-tighter">
          {t('title')}
        </h1>
        <p className="text-lg md:text-xl text-auib-charcoal mb-6 font-medium leading-relaxed">
          {t('description')}
        </p>

        <div className="space-y-4 mb-8 text-auib-charcoal/80">
          <p>{t('feature1')}</p>
          <p>{t('feature2')}</p>
          <p>{t('feature3')}</p>
        </div>

        <a
          href={nexusLoginUrl}
          className="inline-block bg-auib-charcoal text-white p-4 font-bold uppercase tracking-widest hover:bg-auib-red transition-colors border-2 border-auib-charcoal hover:border-auib-red rounded-none"
        >
          {t('loginLink')}
        </a>
      </div>
    </div>
  );
}
