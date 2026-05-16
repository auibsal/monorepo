import React from 'react';
import { cn } from '../lib/utils';

interface LogoProps {
  locale: string;
  className?: string;
}

export default function Logo({ locale, className }: LogoProps) {
  return (
    <div className={cn("font-bold tracking-normal", className)}>
      {locale === 'en' ? (
        <span className="leading-[1.4] block">
          AUIB<br />
          Society of<br />
          Arts and<br />
          Letters
        </span>
      ) : (
        <span className="leading-[1.4] block" dir="rtl">
          جمعيةُ الفنونِ<br />
          والآدابِ في<br />
          الجامعةِ<br />
          الأمريكيةِ
        </span>
      )}
    </div>
  );
}
