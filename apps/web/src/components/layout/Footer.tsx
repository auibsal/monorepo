import { useTranslations } from 'next-intl';

export const Footer = () => {
  const t = useTranslations('Footer');

  return (
    <footer className="w-full bg-zinc-950 border-t border-zinc-900 py-8 px-8 md:px-12 text-zinc-500">
      <div className="flex flex-col md:flex-row justify-between items-center text-[10px] uppercase tracking-widest">
        <p>© {new Date().getFullYear()} THE IRAQI CURATOR. {t('rights')}</p>
        <p className="mt-4 md:mt-0 text-amber-500/50">{t('location')}</p>
      </div>
    </footer>
  );
};
