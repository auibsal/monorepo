import { useTranslations } from 'next-intl';

export default function Journal() {
  const t = useTranslations('JournalPage');

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      
      <header className="text-center mb-20 border-b border-auib-charcoal/10 pb-16">
        <h1 className="text-5xl md:text-6xl font-bold text-auib-charcoal mb-4 font-serif">
          {t('journalName')}
        </h1>
        <p className="text-xl text-auib-red italic mb-8">
          {t('journalSubtitle')}
        </p>
        <p className="text-lg leading-relaxed max-w-2xl mx-auto">
          {t('journalIntro')}
        </p>
      </header>

      <div className="space-y-16">
        {/* Mocked Journal Entries */}
        <article className="group cursor-pointer">
          <div className="flex items-center gap-4 mb-3">
            <span className="text-xs text-auib-charcoal bg-auib-charcoal/10 px-3 py-1 rounded-full uppercase tracking-widest font-bold">
              Vol. I, Issue 1
            </span>
            <span className="text-sm text-auib-charcoal/60">May 2026</span>
          </div>
          <h3 className="text-3xl font-bold mt-1 group-hover:text-auib-red transition-colors mb-3">
            {t('article1Title')}
          </h3>
          <p className="text-lg text-auib-charcoal/80 leading-relaxed mb-4">
            {t('article1Excerpt')}
          </p>
          <span className="text-auib-red font-medium hover:underline underline-offset-4">
            {t('readMore')} &rarr;
          </span>
        </article>
      </div>

    </div>
  );
}
