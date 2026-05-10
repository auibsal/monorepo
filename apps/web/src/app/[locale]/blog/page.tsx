import { useTranslations } from 'next-intl';

export default function BlogPage() {
  const t = useTranslations('BlogPage');

  return (
    <div className="container mx-auto px-4 py-12 text-start">
      <h1 className="text-4xl font-bold mb-6 text-primary">{t('title')}</h1>
      <p className="text-lg leading-relaxed mb-8">{t('subtitle')}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Blog posts will go here */}
        <div className="border border-border p-6 text-start">
            <h2 className="text-2xl font-bold mb-2">{t('placeholderTitle')}</h2>
            <p className="text-muted-foreground">{t('placeholderDesc')}</p>
        </div>
      </div>
    </div>
  );
}
