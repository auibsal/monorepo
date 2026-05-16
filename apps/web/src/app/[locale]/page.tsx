
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { buttonVariants } from '@auibsal/ui';
import { BookOpen, Users } from 'lucide-react';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'HomePage' });

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 md:py-32">
      
      {/* Architectural Header */}
      <section className="mb-28 flex flex-col items-start border-l-8 border-auib-red pl-6 md:pl-10">
        <h1 className="text-5xl md:text-7xl font-bold text-auib-charcoal mb-6 uppercase tracking-tight leading-none">
          {t('title')}
        </h1>
        <p className="text-xl md:text-3xl text-auib-charcoal/90 max-w-4xl leading-relaxed font-medium">
          {t('subtitle')}
        </p>
      </section>

      {/* Hard Divider */}
      <div className="w-full h-1.5 bg-auib-charcoal mb-28"></div>

      {/* Brutalist Grid */}
      <section className="grid md:grid-cols-2 gap-12 md:gap-16">
        
        {/* Card 1: Mission */}
        <div className="group bg-white p-10 border-4 border-auib-charcoal shadow-[12px_12px_0px_0px_#273237] hover:shadow-[16px_16px_0px_0px_#273237] hover:-translate-y-1 hover:-translate-x-1 transition-all duration-200">
          <div className="w-16 h-16 bg-auib-charcoal flex items-center justify-center mb-8 border-2 border-transparent">
            <BookOpen size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-auib-charcoal mb-4 uppercase tracking-wider">{t('missionTitle')}</h2>
          <p className="text-lg leading-relaxed text-auib-charcoal font-medium">
            {t('missionText')}
          </p>
        </div>

        {/* Card 2: Membership */}
        <div className="group bg-auib-red p-10 border-4 border-auib-charcoal shadow-[12px_12px_0px_0px_#273237] hover:shadow-[16px_16px_0px_0px_#273237] hover:-translate-y-1 hover:-translate-x-1 transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="w-16 h-16 bg-white flex items-center justify-center mb-8 border-2 border-auib-charcoal shadow-[4px_4px_0px_0px_#273237]">
              <Users size={32} className="text-auib-red" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4 uppercase tracking-wider">{t('membershipTitle')}</h2>
            <p className="text-lg leading-relaxed text-white/90 mb-10 font-medium">
              {t('membershipText')}
            </p>
          </div>
          
          <Link 
            href="/login" 
            className={`${buttonVariants({ variant: 'outline', size: 'lg' })} w-full md:w-auto bg-white text-auib-charcoal hover:bg-auib-charcoal hover:text-white border-2 border-auib-charcoal shadow-[6px_6px_0px_0px_#273237]`}
          >
            {t('applyButton')}
          </Link>
        </div>

      </section>
    </div>
  );
}
