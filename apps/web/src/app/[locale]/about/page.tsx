import { getTranslations } from 'next-intl/server';

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'AboutPage' });

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 md:py-32 text-start">
      
      {/* Architectural Header */}
      <section className="mb-16 flex flex-col items-start border-l-8 border-auib-red pl-6 md:pl-10">
        <h1 className="text-4xl md:text-6xl font-bold text-auib-charcoal uppercase tracking-tight leading-none">
          {t('title')}
        </h1>
      </section>

      {/* Hard Divider */}
      <div className="w-full h-1.5 bg-auib-charcoal mb-16"></div>

      {/* Brutalist Typography Block */}
      <div className="max-w-4xl">
        <p className="text-xl md:text-2xl leading-relaxed text-auib-charcoal/90 font-medium mb-8">
          {t('p1')}
        </p>
        <p className="text-xl md:text-2xl leading-relaxed text-auib-charcoal/90 font-medium">
          {t('p2')}
        </p>
      </div>
      
    </div>
  );
}
