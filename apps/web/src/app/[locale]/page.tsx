import { getTranslations } from 'next-intl/server';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'HomePage' });

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 md:py-32">
      <section className="text-center mb-28 flex flex-col items-center">
        <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-auib-red to-[#5a1122] mb-8 tracking-tight leading-tight">
          {t('title')}
        </h1>
        <p className="text-xl md:text-3xl text-auib-charcoal/80 max-w-4xl mx-auto leading-relaxed font-light">
          {t('subtitle')}
        </p>
      </section>

      <div className="w-32 h-1.5 bg-gradient-to-r from-auib-red/20 via-auib-red to-auib-red/20 mx-auto mb-28 rounded-full"></div>

      <section className="grid md:grid-cols-2 gap-12 md:gap-16">
        <div className="group bg-white p-10 rounded-2xl border border-auib-charcoal/5 shadow-lg shadow-auib-charcoal/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="w-12 h-12 bg-auib-red/10 rounded-full flex items-center justify-center mb-6 text-auib-red group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-auib-charcoal mb-4">{t('missionTitle')}</h2>
          <p className="text-lg leading-relaxed text-auib-charcoal/70">
            {t('missionText')}
          </p>
        </div>

        <div className="group bg-auib-charcoal text-white p-10 rounded-2xl shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-auib-red/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-6 text-auib-white group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">{t('membershipTitle')}</h2>
            <p className="text-lg leading-relaxed text-white/80 mb-10">
              {t('membershipText')}
            </p>
            <button className="px-8 py-4 bg-auib-red text-white font-bold rounded-lg hover:bg-white hover:text-auib-red transition-all shadow-lg hover:shadow-auib-red/20 w-full md:w-auto text-center">
              {t('applyButton')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
