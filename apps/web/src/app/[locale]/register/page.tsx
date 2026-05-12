import { useTranslations } from 'next-intl';
import RegisterForm from './RegisterForm';

export default function RegisterPage() {
  const t = useTranslations('LoginPage'); // Using the same namespace since it was unified before

  return (
    <div className="min-h-screen flex items-center justify-center bg-auib-white p-4 font-sans py-12 md:py-24">
      <div className="w-full max-w-xl border-2 border-auib-charcoal bg-auib-charcoal text-auib-white shadow-[8px_8px_0px_0px_#9C213E]">
        <div className="p-8 md:p-12">
          <h2 className="text-2xl md:text-3xl font-bold text-auib-white mb-2 uppercase tracking-tight">
            {t('registerTitle')}
          </h2>
          <p className="text-sm text-auib-white/70 mb-8 font-medium">
            {t('registerSubtitle')}
          </p>
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
