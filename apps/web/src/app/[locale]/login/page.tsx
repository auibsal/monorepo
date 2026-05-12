import { useTranslations } from 'next-intl';
import LoginForm from './LoginForm';

export default function LoginPage() {
  const t = useTranslations('LoginPage');

  return (
    <div className="min-h-screen flex items-center justify-center bg-auib-white p-4 font-sans py-12 md:py-24">
      <div className="w-full max-w-xl border-2 border-auib-charcoal bg-white shadow-[8px_8px_0px_0px_#273237]">
        <div className="p-8 md:p-12">
          <h2 className="text-2xl md:text-3xl font-bold text-auib-charcoal mb-2 uppercase tracking-tight">
            {t('loginTitle')}
          </h2>
          <p className="text-sm text-auib-charcoal/70 mb-8 font-medium">
            {t('loginSubtitle')}
          </p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
