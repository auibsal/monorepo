import { useTranslations } from 'next-intl';

export default function SubmitPage() {
  const t = useTranslations('SubmitPage');

  return (
    <div className="container mx-auto px-4 py-12 text-start">
      <h1 className="text-4xl font-bold mb-6 text-primary">{t('title')}</h1>
      <p className="text-lg leading-relaxed mb-8">{t('instructions')}</p>

      <form className="max-w-2xl text-start space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">{t('formTitle')}</label>
          <input type="text" className="w-full bg-background border border-border p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">{t('formType')}</label>
          <select className="w-full bg-background border border-border p-2">
            <option>{t('typeEssay')}</option>
            <option>{t('typePoetry')}</option>
            <option>{t('typeFiction')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">{t('formContent')}</label>
          <textarea rows={10} className="w-full bg-background border border-border p-2"></textarea>
        </div>
        <button type="submit" className="bg-primary text-primary-foreground px-6 py-2 font-medium">
          {t('submitButton')}
        </button>
      </form>
    </div>
  );
}
