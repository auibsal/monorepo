import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Logo } from 'ui';

export default async function Footer({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'Footer' });
  const year = new Date().getFullYear();

  return (
    <footer className="bg-auib-red text-auib-white pt-16 pb-8 border-t-4 border-auib-charcoal">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12 border-b border-auib-white/10 pb-12">
          
          <div className="md:col-span-1">
            <div className="mb-6">
              <Logo locale={locale} className="text-xl text-auib-white" />
            </div>
            <p className="text-auib-white/70 text-sm leading-relaxed">
              {t('description')}
            </p>
          </div>

          <div className="md:col-span-1">
            <h4 className="text-lg font-semibold mb-4 text-auib-charcoal">{t('linksTitle')}</h4>
            <ul className="space-y-2 text-sm text-auib-white/80">
              {/* Clean paths here as well */}
              <li><Link href="/" className="hover:text-auib-white transition-colors">{t('home')}</Link></li>
              <li><Link href="/events" className="hover:text-auib-white transition-colors">{t('events')}</Link></li>
              <li><Link href="/journal" className="hover:text-auib-white transition-colors">{t('journal')}</Link></li>
            </ul>
          </div>

          <div className="md:col-span-1 text-sm text-auib-white/80">
             <h4 className="text-lg font-semibold mb-4 text-auib-charcoal">{t('contactTitle')}</h4>
             <address className="not-italic leading-relaxed">
               {t('university')}<br />
               {t('addressLine1')}<br />
               {t('addressLine2')}
             </address>
          </div>
        </div>

        <div className=" text-xs text-auib-white/50 flex flex-col md:flex-row justify-between items-center">
          <p>&copy; {year} {t('societyName')}. {t('rights')}</p>
          <p className="mt-2 md:mt-0">{t('designedBy')}</p>
        </div>
      </div>
    </footer>
  );
}
