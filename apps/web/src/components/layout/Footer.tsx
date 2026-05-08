import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function Footer({ locale }: { locale: string }) {
  const t = useTranslations('Footer');
  const year = new Date().getFullYear();

  return (
    <footer className="bg-auib-charcoal text-auib-white pt-16 pb-8 border-t-4 border-auib-red">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12 border-b border-auib-white/10 pb-12">
          
          {/* Brand Identity */}
          <div className="md:col-span-1">
            <h3 className="text-xl font-bold mb-4">{t('societyName')}</h3>
            <p className="text-auib-white/70 text-sm leading-relaxed">
              {t('description')}
            </p>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-1">
            <h4 className="text-lg font-semibold mb-4 text-auib-red">{t('linksTitle')}</h4>
            <ul className="space-y-2 text-sm text-auib-white/80">
              <li><Link href={`/${locale}`} className="hover:text-auib-white transition-colors">{t('home')}</Link></li>
              <li><Link href={`/${locale}/events`} className="hover:text-auib-white transition-colors">{t('events')}</Link></li>
              <li><Link href={`/${locale}/journal`} className="hover:text-auib-white transition-colors">{t('journal')}</Link></li>
            </ul>
          </div>

          {/* Location */}
          <div className="md:col-span-1 text-sm text-auib-white/80">
             <h4 className="text-lg font-semibold mb-4 text-auib-red">{t('contactTitle')}</h4>
             <address className="not-italic leading-relaxed">
               {t('university')}<br />
               {t('addressLine1')}<br />
               {t('addressLine2')}
             </address>
          </div>
        </div>

        <div className="text-center text-xs text-auib-white/50 flex flex-col md:flex-row justify-between items-center">
          <p>&copy; {year} {t('societyName')}. {t('rights')}</p>
          <p className="mt-2 md:mt-0">{t('designedBy')}</p>
        </div>
      </div>
    </footer>
  );
}
