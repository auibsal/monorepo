import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Logo } from 'ui';

export default async function Footer({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'Footer' });
  const year = new Date().getFullYear();

  return (
    <footer className="bg-auib-red text-white pt-16 pb-8 border-t-4 border-auib-charcoal">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12 border-b-2 border-auib-charcoal pb-12">
          
          <div className="md:col-span-1">
            <div className="mb-6">
              <Logo locale={locale} className="text-xl text-white" />
            </div>
            <p className="text-white/80 text-sm leading-relaxed font-medium">
              {t('description')}
            </p>
          </div>

          <div className="md:col-span-1">
            {/* CRITICAL: Brutalist label style to fix WCAG contrast failure */}
            <h4 className="inline-block bg-auib-charcoal text-white px-3 py-1 mb-6 text-xs font-bold uppercase tracking-widest">
              {t('linksTitle')}
            </h4>
            <ul className="space-y-3 text-sm font-bold uppercase tracking-wider text-white/80">
              <li>
                <Link href="/" className="hover:text-white hover:translate-x-1 rtl:hover:-translate-x-1 transition-all inline-block">
                  {t('home')}
                </Link>
              </li>
              <li>
                <Link href="/events" className="hover:text-white hover:translate-x-1 rtl:hover:-translate-x-1 transition-all inline-block">
                  {t('events')}
                </Link>
              </li>
              <li>
                <Link href="/journal" className="hover:text-white hover:translate-x-1 rtl:hover:-translate-x-1 transition-all inline-block">
                  {t('journal')}
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-1 text-sm font-medium text-white/80">
             <h4 className="inline-block bg-auib-charcoal text-white px-3 py-1 mb-6 text-xs font-bold uppercase tracking-widest">
               {t('contactTitle')}
             </h4>
             <address className="not-italic leading-relaxed">
               {t('university')}<br />
               {t('addressLine1')}<br />
               {t('addressLine2')}
             </address>
          </div>
        </div>

        <div className="text-xs font-bold uppercase tracking-wider text-white/60 flex flex-col md:flex-row justify-between items-center">
          <p>&copy; {year} {t('societyName')}. {t('rights')}</p>
          <p className="mt-4 md:mt-0">{t('designedBy')}</p>
        </div>
      </div>
    </footer>
  );
}
