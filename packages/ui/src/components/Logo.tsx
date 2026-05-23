import { cn } from '../lib/utils';

interface LogoProps {
  // 1. Lock down the locale to strict literal types
  locale: 'en' | 'ar';
  className?: string;
}

export default function Logo({ locale, className }: LogoProps) {
  return (
    <div className={cn('font-bold tracking-normal', className)}>
      {locale === 'en' ? (
        <span className="block leading-[1.4]">
          AUIB
          <br />
          Society of
          <br />
          Arts and
          <br />
          Letters
        </span>
      ) : (
        <span className="block leading-[1.4]" dir="rtl">
          جمعيةُ الفنونِ
          <br />
          والآدابِ في
          <br />
          الجامعةِ
          <br />
          الأمريكيةِ
        </span>
      )}
    </div>
  );
}
