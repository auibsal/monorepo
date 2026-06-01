import { cn } from '../lib/utils';

interface LogoProps {
  // 1. Lock down the locale to strict literal types
  locale: 'en' | 'ar';
  className?: string;
}

/**
 * Logo
 *
 * @description Standardized execution for Logo.
 */
export function Logo({ locale, className }: LogoProps) {
  // Contiguous text for seamless screen reader parsing
  const srText =
    locale === 'en'
      ? 'AUIB Society of Arts and Letters'
      : 'جمعية الفنون والآداب في الجامعة الأمريكية';

  return (
    <div
      className={cn(
        // Base weight locked in.
        'font-black',
        // English gets brutalist uppercase and tight tracking.
        // Arabic relies on natural cursive flow (no tracking adjustments).
        locale === 'en' && 'uppercase tracking-tighter',
        className,
      )}
    >
      {/* 2. Accessible layer: Screen readers read this smoothly */}
      <span className="sr-only">{srText}</span>

      {/* 3. Visual layer: Hidden from screen readers to prevent duplicate/stilted reading */}
      <div aria-hidden="true">
        {locale === 'en' ? (
          <span className="block leading-[1.1]">
            AUIB
            <br />
            Society of
            <br />
            Arts and
            <br />
            Letters
          </span>
        ) : (
          <span className="block leading-[1.3]" dir="rtl">
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
    </div>
  );
}
