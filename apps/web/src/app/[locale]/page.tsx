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
      <section className="mb-28 flex flex-col items-start border-l-8 border-primary pl-6 md:pl-10">
        {/* Swapped text-auib-charcoal to text-foreground */}
        <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 uppercase tracking-tight leading-none">
          {t('title')}
        </h1>
        {/* Swapped text-auib-charcoal/90 to text-foreground/90 */}
        <p className="text-xl md:text-3xl text-foreground/90 max-w-4xl leading-relaxed font-medium">
          {t('subtitle')}
        </p>
      </section>

      {/* Hard Divider - Mapped to foreground for high contrast in both themes */}
      <div className="w-full h-1.5 bg-foreground mb-28"></div>

      {/* Brutalist Grid */}
      <section className="grid md:grid-cols-2 gap-12 md:gap-16">
        
        {/* Card 1: Mission */}
        {/* Replaced hardcoded hexes with semantic background, border, and dynamic shadow variables */}
        <div className="group bg-card p-10 border-4 border-border shadow-[12px_12px_0px_0px_var(--brutalist-shadow)] hover:shadow-[16px_16px_0px_0px_var(--brutalist-shadow)] hover:-translate-y-1 hover:-translate-x-1 transition-all duration-200">
          <div className="w-16 h-16 bg-foreground flex items-center justify-center mb-8 border-2 border-transparent">
            <BookOpen size={32} className="text-background" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4 uppercase tracking-wider">{t('missionTitle')}</h2>
          <p className="text-lg leading-relaxed text-foreground font-medium">
            {t('missionText')}
          </p>
        </div>

        {/* Card 2: Membership (Keeps AUIB Red as a distinct brand accent, but hooks the shadows) */}
        <div className="group bg-primary p-10 border-4 border-border shadow-[12px_12px_0px_0px_var(--brutalist-shadow)] hover:shadow-[16px_16px_0px_0px_var(--brutalist-shadow)] hover:-translate-y-1 hover:-translate-x-1 transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="w-16 h-16 bg-background flex items-center justify-center mb-8 border-2 border-border shadow-[4px_4px_0px_0px_var(--brutalist-shadow)]">
              <Users size={32} className="text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-primary-foreground mb-4 uppercase tracking-wider">{t('membershipTitle')}</h2>
            <p className="text-lg leading-relaxed text-primary-foreground/90 mb-10 font-medium">
              {t('membershipText')}
            </p>
          </div>
          
          <Link 
            href="/login" 
            className={`${buttonVariants({ variant: 'outline', size: 'lg' })} w-full md:w-auto bg-background text-foreground hover:bg-foreground hover:text-background border-2 border-border shadow-[6px_6px_0px_0px_var(--brutalist-shadow)]`}
          >
            {t('applyButton')}
          </Link>
        </div>

      </section>
    </div>
  );
}
