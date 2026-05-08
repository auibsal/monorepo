import { getTranslations } from 'next-intl/server';
import Image from 'next/image';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'HomePage' });

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
      <section className="text-center mb-24 flex flex-col items-center">
        <Image 
          src="/logos/Logos_20260508_143919_0002.png" 
          alt="AUIB Society of Arts and Letters" 
          width={180} 
          height={180} 
          className="mb-10 object-contain drop-shadow-sm"
        />
        <h1 className="text-4xl md:text-6xl font-bold text-auib-red mb-6 tracking-tight">
          {t('title')}
        </h1>
        <p className="text-xl md:text-2xl text-auib-charcoal max-w-3xl mx-auto leading-relaxed">
          {t('subtitle')}
        </p>
      </section>

      <div className="w-24 h-1 bg-auib-red mx-auto mb-20 rounded-full"></div>

      <section className="grid md:grid-cols-2 gap-16">
        <div className="bg-auib-charcoal/5 p-8 rounded-sm border border-auib-charcoal/10">
          <h2 className="text-3xl font-semibold text-auib-red mb-4">{t('missionTitle')}</h2>
          <p className="text-lg leading-relaxed text-auib-charcoal/90">
            {t('missionText')}
          </p>
        </div>
        <div className="bg-auib-charcoal/5 p-8 rounded-sm border border-auib-charcoal/10">
          <h2 className="text-3xl font-semibold text-auib-red mb-4">{t('membershipTitle')}</h2>
          <p className="text-lg leading-relaxed text-auib-charcoal/90 mb-8">
            {t('membershipText')}
          </p>
          <button className="px-8 py-3 bg-auib-red text-auib-white font-medium hover:bg-auib-charcoal transition-all shadow-sm">
            {t('applyButton')}
          </button>
        </div>
      </section>
    </div>
  );
}
