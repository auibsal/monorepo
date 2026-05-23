import { Link } from '@/i18n/routing';
import { BookOpen, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { buttonVariants } from '@auibsal/ui/components/ui/button';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'HomePage' });

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:py-32">
      {/* Architectural Header */}
      <section className="mb-28 flex flex-col items-start border-l-8 border-primary pl-6 md:pl-10">
        {/* Swapped text-auib-charcoal to text-foreground */}
        <h1 className="mb-6 text-5xl leading-none font-bold tracking-tight text-foreground uppercase md:text-7xl">
          {t('title')}
        </h1>
        {/* Swapped text-auib-charcoal/90 to text-foreground/90 */}
        <p className="max-w-4xl text-xl leading-relaxed font-medium text-foreground/90 md:text-3xl">
          {t('subtitle')}
        </p>
      </section>

      {/* Hard Divider - Mapped to foreground for high contrast in both themes */}
      <div className="mb-28 h-1.5 w-full bg-foreground"></div>

      {/* Brutalist Grid */}
      <section className="grid gap-12 md:grid-cols-2 md:gap-16">
        {/* Card 1: Mission */}
        {/* Replaced hardcoded hexes with semantic background, border, and dynamic shadow variables */}
        <div className="group border-4 border-border bg-card p-10 shadow-[12px_12px_0px_0px_var(--brutalist-shadow)] transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[16px_16px_0px_0px_var(--brutalist-shadow)]">
          <div className="mb-8 flex h-16 w-16 items-center justify-center border-2 border-transparent bg-foreground">
            <BookOpen size={32} className="text-background" />
          </div>
          <h2 className="mb-4 text-3xl font-bold tracking-wider text-foreground uppercase">
            {t('missionTitle')}
          </h2>
          <p className="text-lg leading-relaxed font-medium text-foreground">{t('missionText')}</p>
        </div>

        {/* Card 2: Membership (Keeps AUIB Red as a distinct brand accent, but hooks the shadows) */}
        <div className="group flex flex-col justify-between border-4 border-border bg-primary p-10 shadow-[12px_12px_0px_0px_var(--brutalist-shadow)] transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[16px_16px_0px_0px_var(--brutalist-shadow)]">
          <div>
            <div className="mb-8 flex h-16 w-16 items-center justify-center border-2 border-border bg-background shadow-[4px_4px_0px_0px_var(--brutalist-shadow)]">
              <Users size={32} className="text-primary" />
            </div>
            <h2 className="mb-4 text-3xl font-bold tracking-wider text-primary-foreground uppercase">
              {t('membershipTitle')}
            </h2>
            <p className="mb-10 text-lg leading-relaxed font-medium text-primary-foreground/90">
              {t('membershipText')}
            </p>
          </div>

          <Link
            href="/login"
            className={`${buttonVariants({ variant: 'outline', size: 'lg' })} w-full border-2 border-border bg-background text-foreground shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] hover:bg-foreground hover:text-background md:w-auto`}
          >
            {t('applyButton')}
          </Link>
        </div>
      </section>
    </div>
  );
}
